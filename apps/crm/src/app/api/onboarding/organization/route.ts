import 'server-only'

import { apiJson } from '@876/core/api'
import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { CRM_APP_SLUG } from '@/lib/crm-app'

export const runtime = 'nodejs'

const organizationSchema = z.strictObject({
  name: z.string().trim().min(1).max(120).optional(),
})

const PROVISIONING_ROLES = new Set(['owner', 'admin'])
const CONFLICT_CODES = new Set([
  'organization/slug-taken',
  'organization/already-exists',
  'organization/duplicate-slug',
])

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = organizationSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter an organization name.' }, { status: 422 })

  const platform = await getPlatformClient()
  const memberships = await platform.memberships.listRouting({
    userId: session.user.id,
    status: 'active',
  })

  if (memberships.error) {
    Sentry.captureMessage('CRM onboarding: routing memberships failed', {
      level: 'error',
      tags: { category: 'platform_client', phase: 'crm_onboarding' },
      extra: { errorCode: memberships.error.code ?? null, userId: session.user.id },
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
      { error: 'Only an owner or admin can add 876 CRM.' },
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

  const subscription = await platform.subscriptions.create(organizationId, {
    appSlug: CRM_APP_SLUG,
  })
  if (subscription.error) {
    Sentry.captureMessage('CRM onboarding: subscription activation failed', {
      level: 'error',
      tags: { category: 'platform_client', phase: 'crm_onboarding' },
      extra: {
        errorCode: subscription.error.code,
        organizationId,
        userId: session.user.id,
      },
    })
    return apiJson(
      { error: subscription.error.message || 'Failed to activate 876 CRM.' },
      { status: 502, code: subscription.error.code }
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
