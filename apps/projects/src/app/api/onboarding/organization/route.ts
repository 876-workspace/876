import 'server-only'

import { apiJson } from '@876/core/api'
import * as Sentry from '@sentry/nextjs'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/services/platform'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { PROJECTS_APP_SLUG } from '@/lib/projects-app'
import { projects } from '@/lib/services/projects'

export const runtime = 'nodejs'

const organizationSchema = z.strictObject({
  name: z.string().trim().min(1).max(120).optional(),
})

const PROVISIONING_ROLES = new Set(['super-admin', 'admin'])
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
    Sentry.captureMessage('Projects onboarding: routing memberships failed', {
      level: 'error',
      tags: { category: 'platform_client', phase: 'crm_onboarding' },
      extra: {
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
      { error: 'Only an owner or admin can add 876 Projects.' },
      { status: 403 }
    )

  if (!organizationId) {
    if (!parsed.data.name)
      return apiJson({ error: 'Enter an organization name.' }, { status: 422 })

    const organization = await platform.organizations.create({
      creatorUserId: session.user.id,
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
    appSlug: PROJECTS_APP_SLUG,
  })
  if (subscription.error) {
    Sentry.captureMessage(
      'Projects onboarding: subscription activation failed',
      {
        level: 'error',
        tags: { category: 'platform_client', phase: 'crm_onboarding' },
        extra: {
          errorCode: subscription.error.code,
          organizationId,
          userId: session.user.id,
        },
      }
    )
    return apiJson(
      {
        error: subscription.error.message || 'Failed to activate 876 Projects.',
      },
      { status: 502, code: subscription.error.code }
    )
  }

  const tenant = await projects.tenants.ensure(organizationId)

  if (tenant.error) {
    Sentry.captureMessage('Projects onboarding: tenant provisioning failed', {
      level: 'error',
      tags: { category: 'projects_api', phase: 'projects_onboarding' },
      extra: {
        organizationId,
        userId: session.user.id,
        errorCode: tenant.error.code,
      },
    })
    return apiJson(
      { error: '876 Projects could not finish preparing this workspace.' },
      { status: 502, code: 'projects/tenant-provisioning-failed' }
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
