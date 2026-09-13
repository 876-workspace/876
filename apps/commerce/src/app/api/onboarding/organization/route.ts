import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getCommerceSession } from '@/lib/auth/session'
import { normalizeOrgRole } from '@/lib/auth/roles'
import { COMMERCE_APP_SLUG } from '@/lib/commerce-app'
import { getPlatformClient } from '@/lib/services/platform'

export const runtime = 'nodejs'

const organizationSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
})

const CONFLICT_CODES = new Set([
  'organization/slug-taken',
  'organization/already-exists',
  'organization/duplicate-slug',
])

export async function POST(request: NextRequest) {
  const session = await getCommerceSession()
  if (!session) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (session.realm === 'consumer' && !session.crossRealm)
    return apiJson(
      { error: 'Use a work account for 876 Commerce.' },
      { status: 403 }
    )

  const body = await request.json().catch(() => null)
  const parsed = organizationSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter an organization name.' }, { status: 422 })

  const platform = await getPlatformClient()
  const memberships = await platform.memberships.listRouting({
    userId: session.userId,
    status: 'active',
  })
  if (memberships.error)
    return apiJson(
      { error: 'We could not reach 876 to verify your account.' },
      { status: 503 }
    )

  const existing = memberships.data.data.find(
    (membership) =>
      membership.status === 'active' &&
      membership.organization.status === 'active'
  )
  let organizationId = existing?.organization.id

  if (existing && normalizeOrgRole(existing.role) === 'staff')
    return apiJson(
      { error: 'Only an owner or admin can add 876 Commerce.' },
      { status: 403 }
    )

  if (!organizationId) {
    if (!parsed.data.name)
      return apiJson({ error: 'Enter an organization name.' }, { status: 422 })

    const organization = await platform.organizations.create({
      creatorUserId: session.userId,
      name: parsed.data.name,
    })
    if (organization.error)
      return apiJson(
        { error: organization.error.message, code: organization.error.code },
        { status: CONFLICT_CODES.has(organization.error.code) ? 409 : 502 }
      )

    organizationId = organization.data.id
  }

  const subscription = await platform.subscriptions.create(organizationId, {
    appSlug: COMMERCE_APP_SLUG,
  })
  if (subscription.error)
    return apiJson(
      {
        error: subscription.error.message || 'Failed to activate 876 Commerce.',
        code: subscription.error.code,
      },
      { status: 502 }
    )

  return apiJson({
    data: {
      object: 'onboarding_completion',
      organization_id: organizationId,
      access_status: 'active',
    },
  })
}
