/** Row → API resource for onboarding sessions. */

import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type {
  JsonValue,
  OnboardingSession,
  OnboardingStatus,
  OnboardingTargetType,
} from './onboarding.schemas'
import {
  ONBOARDING_STATUSES,
  ONBOARDING_TARGET_TYPES,
} from './onboarding.schemas'

export type OnboardingAnswerRow = {
  fieldKey: string
  value: unknown
}

export type OnboardingSessionRow = {
  id: string
  organizationId: string
  targetType: string
  targetKey: string
  countryCode: string
  schemaVersion: number
  catalogRevision: number
  status: string
  submittedAt: bigint | null
  completedAt: bigint | null
  createdAt: bigint
  updatedAt: bigint
  onboardingAnswers: OnboardingAnswerRow[]
}

export const ONBOARDING_SESSION_SELECT = {
  id: true,
  organizationId: true,
  targetType: true,
  targetKey: true,
  countryCode: true,
  schemaVersion: true,
  catalogRevision: true,
  status: true,
  submittedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  onboardingAnswers: { select: { fieldKey: true, value: true } },
} as const

function asTargetType(value: string): OnboardingTargetType {
  return (ONBOARDING_TARGET_TYPES as readonly string[]).includes(value)
    ? (value as OnboardingTargetType)
    : 'organization'
}

function asStatus(value: string): OnboardingStatus {
  return (ONBOARDING_STATUSES as readonly string[]).includes(value)
    ? (value as OnboardingStatus)
    : 'draft'
}

/**
 * Collapse the answer rows into the flat `{ field_key: value }` map the API
 * exposes.
 *
 * A stored `value` is a `Json` column, so it is already a JSON value — but an
 * `undefined` cannot survive `JSON.stringify`, so a missing one degrades to
 * `null` rather than dropping the key. The client asked for that field's answer
 * and should see that it has none.
 */
export function answersOf(
  row: OnboardingSessionRow
): Record<string, JsonValue> {
  const answers: Record<string, JsonValue> = {}
  for (const answer of row.onboardingAnswers) {
    answers[answer.fieldKey] = (answer.value ?? null) as JsonValue
  }

  return answers
}

export function serializeOnboardingSession(
  row: OnboardingSessionRow
): OnboardingSession {
  return {
    object: 'onboarding_session',
    id: row.id,
    organization_id: row.organizationId,
    target_type: asTargetType(row.targetType),
    target_key: row.targetKey,
    country_code: row.countryCode,
    schema_version: 1,
    catalog_revision: row.catalogRevision,
    status: asStatus(row.status),
    answers: answersOf(row),
    submitted_at: nullableFromDbUnixSeconds(row.submittedAt),
    completed_at: nullableFromDbUnixSeconds(row.completedAt),
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
