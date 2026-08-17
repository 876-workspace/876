import 'server-only'

import { apiJson } from '@876/core/api'
import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { INVOICE_APP_SLUG } from '@/lib/invoice-app'

export const runtime = 'nodejs'

/**
 * `name` is only needed when there is no organization yet. An account that
 * already has one is *activating* Invoice for it, and must not be able to
 * rename it through this route.
 */
const organizationSchema = z.strictObject({
  name: z.string().trim().min(1).max(120).optional(),
})

/** Roles allowed to add an app to an organization. */
const PROVISIONING_ROLES = new Set(['owner', 'admin'])

/** Slug/name collisions the caller can fix by choosing another name. */
const CONFLICT_CODES = new Set([
  'organization/slug-taken',
  'organization/already-exists',
  'organization/duplicate-slug',
])

function mapSubscriptionError(error: { code: string; message?: string }) {
  if (error.code === 'provisioning/finance-workspace-unavailable') {
    return {
      status: 503,
      code: error.code,
      message:
        'Your organization was created, but Invoice could not finish connecting to Billing. Try again.',
    }
  }

  if (
    error.code === 'provisioning/application-profile-missing' ||
    error.code === 'provisioning/finance-dependency-missing' ||
    error.code === 'provisioning/finance-scopes-missing'
  ) {
    return {
      status: 503,
      code: error.code,
      message:
        '876 Invoice is temporarily unavailable because its provisioning configuration is incomplete.',
    }
  }

  return {
    status: 502,
    code: error.code,
    message: error.message || 'Failed to activate 876 Invoice.',
  }
}

/**
 * Creates the signed-in account's organization when it has none, then
 * ensures the `876-invoice` subscription and its finance workspace are active.
 *
 * An organization that already exists — including one already using 876
 * Billing — takes the activation path only: it keeps its records and gains
 * Invoice. The Billing finance workspace is prepared with Invoice's scopes
 * attached.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = organizationSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter an organization name.' }, { status: 422 })

  const platform = await getPlatformClient()

  // Resolved live rather than from the sealed session cookie, so an
  // organization created moments ago is seen on this request.
  const memberships = await platform.memberships.listRouting({
    userId: session.user.id,
    status: 'active',
  })
  if (memberships.error) {
    Sentry.captureMessage('Invoice onboarding: routing memberships failed', {
      level: 'error',
      tags: {
        category: 'platform_client',
        phase: 'invoice_onboarding',
        dependency: '876_api',
      },
      extra: {
        call: 'memberships.listRouting',
        errorCode: memberships.error.code ?? null,
        userId: session.user.id,
      },
    })
    return apiJson(
      { error: 'We could not reach 876 to verify your account.' },
      { status: 503 }
    )
  }

  const existing = memberships.data.data.find(
    (membership) =>
      membership.status === 'active' &&
      membership.organization.status === 'active'
  )

  let organizationId = existing?.organization.id

  if (existing && !PROVISIONING_ROLES.has(existing.role))
    return apiJson(
      { error: 'Only an owner or admin can add 876 Invoice.' },
      { status: 403 }
    )

  if (!organizationId) {
    if (!parsed.data.name)
      return apiJson({ error: 'Enter an organization name.' }, { status: 422 })

    const organization = await platform.organizations.create({
      ownerUserId: session.user.id,
      name: parsed.data.name,
    })
    if (organization.error) {
      const status = CONFLICT_CODES.has(organization.error.code) ? 409 : 502
      return apiJson(
        { error: organization.error.message },
        { status, code: organization.error.code }
      )
    }

    organizationId = organization.data.id
  }

  // Activation always runs, even when the Invoice subscription is already
  // active (default-org bootstrap, or a prior attempt). An active entitlement
  // is *not* proof the Billing workspace exists — an org can carry an active
  // `876-invoice` subscription with no Billing tenant, which is exactly the
  // `billing/tenant-not-found` state Invoice was stuck in. The API activation
  // is idempotent: it reuses the existing subscription and re-runs finance
  // readiness, so provisioning one more time repairs the missing workspace
  // rather than being skipped as "already done".
  //
  // `requireFinance: 'embedded'` fails closed if Invoice's published profile is
  // ever misconfigured to declare no finance dependency, so a broken profile
  // cannot silently ship Invoice without a Billing workspace.
  const subscription = await platform.subscriptions.create(organizationId, {
    appSlug: INVOICE_APP_SLUG,
    requireFinance: 'embedded',
  })
  if (subscription.error) {
    const mapped = mapSubscriptionError(subscription.error)
    Sentry.captureMessage(
      'Invoice onboarding: subscription activation failed',
      {
        level: 'error',
        tags: {
          category: 'platform_client',
          phase: 'invoice_onboarding',
          app: '876-invoice',
        },
        extra: {
          errorCode: subscription.error.code,
          organizationId,
          userId: session.user.id,
        },
      }
    )
    return apiJson(
      { error: mapped.message },
      { status: mapped.status, code: mapped.code }
    )
  }

  return apiJson({
    data: {
      object: 'onboarding_completion',
      organization_id: organizationId,
      access_status: 'active',
    },
  })
}
