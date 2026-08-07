/**
 * Onboarding business rules.
 *
 * The ordering in `submitSession` is the part worth reading: a saved session is
 * re-validated against **the revision it was answered under**, not the current
 * one, so publishing a stricter catalog cannot retroactively invalidate answers
 * someone already gave and block their submission.
 */

import { AppHttpError } from '@/http/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  onboardingCatalog,
  UnknownCatalogError,
  validateOnboardingAnswers,
} from './onboarding.catalog'
import * as repository from './onboarding.repository'
import type {
  JsonValue,
  OnboardingAnswersReplace,
  OnboardingCatalog,
  OnboardingSession,
  OnboardingTargetType,
  OnboardingValidation,
} from './onboarding.schemas'
import { answersOf, serializeOnboardingSession } from './onboarding.serializers'

/** The two named organization-level onboarding targets. */
const ORGANIZATION_TARGET_KEYS = new Set(['global', 'core'])

function notFound(code: string, message: string): AppHttpError {
  return new AppHttpError({ code, message, httpStatus: 404 })
}

/**
 * Resolve a catalog, turning an unknown target into a 404.
 *
 * The message is the catalog's own — it names the target that was not found,
 * which is the useful part and discloses nothing.
 */
function catalogOrNotFound(
  targetType: OnboardingTargetType,
  targetKey: string,
  countryCode: string,
  catalogRevision?: number | null
): OnboardingCatalog {
  try {
    return onboardingCatalog(
      targetType,
      targetKey,
      countryCode,
      catalogRevision
    )
  } catch (error) {
    if (error instanceof UnknownCatalogError)
      throw notFound('onboarding/catalog-not-found', error.message)
    throw error
  }
}

/**
 * Confirm the organization and the target both exist before touching a session.
 *
 * Checked in this order deliberately: a caller naming an organization that does
 * not exist gets that answer, rather than a confusing complaint about the target
 * within it.
 */
async function requireTargets(
  organizationId: string,
  targetType: OnboardingTargetType,
  targetKey: string
): Promise<void> {
  if (!(await repository.organizationExists(organizationId)))
    throw notFound(
      'onboarding/organization-not-found',
      'Organization not found.'
    )

  if (targetType === 'organization' && !ORGANIZATION_TARGET_KEYS.has(targetKey))
    throw notFound(
      'onboarding/target-not-found',
      "The organization onboarding targets are named 'global' and 'core'."
    )

  if (
    targetType === 'application' &&
    !(await repository.appSlugExists(targetKey))
  )
    throw notFound(
      'onboarding/target-not-found',
      'Application onboarding target not found.'
    )
}

export function retrieveCatalog(
  targetType: OnboardingTargetType,
  targetKey: string,
  countryCode: string
): OnboardingCatalog {
  return catalogOrNotFound(targetType, targetKey, countryCode)
}

export async function retrieveSession(params: {
  organizationId: string
  targetType: OnboardingTargetType
  targetKey: string
  countryCode: string
}): Promise<OnboardingSession> {
  await requireTargets(
    params.organizationId,
    params.targetType,
    params.targetKey
  )

  const catalog = catalogOrNotFound(
    params.targetType,
    params.targetKey,
    params.countryCode
  )

  const row = await repository.getOrCreateSession(
    {
      organizationId: params.organizationId,
      targetType: params.targetType,
      targetKey: params.targetKey,
      countryCode: catalog.country_code,
      catalogRevision: catalog.catalog_revision,
    },
    nowUnixSeconds()
  )

  return serializeOnboardingSession(row)
}

export async function replaceAnswers(params: {
  organizationId: string
  targetType: OnboardingTargetType
  targetKey: string
  body: OnboardingAnswersReplace
}): Promise<OnboardingSession> {
  await requireTargets(
    params.organizationId,
    params.targetType,
    params.targetKey
  )

  const catalog = catalogOrNotFound(
    params.targetType,
    params.targetKey,
    params.body.country_code
  )

  const key = {
    organizationId: params.organizationId,
    targetType: params.targetType,
    targetKey: params.targetKey,
    countryCode: catalog.country_code,
    catalogRevision: catalog.catalog_revision,
  }

  const session = await repository.getOrCreateSession(key, nowUnixSeconds())

  // Answers are stored as given, valid or not. Validation gates submission, not
  // saving — a half-filled draft is the normal state of an onboarding form.
  await repository.replaceAnswers(session.id, params.body.answers, {
    countryCode: catalog.country_code,
    now: nowUnixSeconds(),
  })

  const refreshed = await repository.findSession(key)
  if (!refreshed)
    throw notFound(
      'onboarding/session-not-found',
      'The onboarding session could not be read back.'
    )

  return serializeOnboardingSession(refreshed)
}

export function validateAnswers(
  targetType: OnboardingTargetType,
  targetKey: string,
  body: OnboardingAnswersReplace
): OnboardingValidation {
  const catalog = catalogOrNotFound(targetType, targetKey, body.country_code)
  const issues = validateOnboardingAnswers(
    catalog,
    body.answers as Record<string, JsonValue>
  )

  return { object: 'onboarding_validation', valid: issues.length === 0, issues }
}

export async function submitSession(params: {
  organizationId: string
  targetType: OnboardingTargetType
  targetKey: string
  countryCode: string
}): Promise<OnboardingSession> {
  await requireTargets(
    params.organizationId,
    params.targetType,
    params.targetKey
  )

  const session = await repository.findLatestSessionForTarget({
    organizationId: params.organizationId,
    targetType: params.targetType,
    targetKey: params.targetKey,
    countryCode: params.countryCode.toUpperCase(),
  })

  if (!session) {
    // Resolve the catalog first so an unknown target is reported as such rather
    // than as "save your answers", which would be misleading.
    catalogOrNotFound(params.targetType, params.targetKey, params.countryCode)
    throw notFound(
      'onboarding/session-not-found',
      'Save onboarding answers before submitting them.'
    )
  }

  const catalog = catalogOrNotFound(
    params.targetType,
    params.targetKey,
    session.countryCode,
    session.catalogRevision
  )

  const issues = validateOnboardingAnswers(catalog, answersOf(session))
  if (issues.length > 0)
    throw new AppHttpError({
      code: 'onboarding/validation-failed',
      message: `Onboarding answers failed validation with ${issues.length} issue(s).`,
      httpStatus: 422,
    })

  await repository.markSubmitted(session.id, nowUnixSeconds())

  const refreshed = await repository.findSession({
    organizationId: session.organizationId,
    targetType: session.targetType,
    targetKey: session.targetKey,
    countryCode: session.countryCode,
    catalogRevision: session.catalogRevision,
  })

  return serializeOnboardingSession(refreshed ?? session)
}
