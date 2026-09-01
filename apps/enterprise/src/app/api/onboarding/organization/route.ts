import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { findAuthRoutingUser } from '@/lib/auth/guards'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getPlatformClient } from '@/lib/services/platform'
import {
  organizationBootstrapInputSchema,
  type OrganizationBootstrapResult,
} from '@/types/onboarding'

export const runtime = 'nodejs'

/**
 * Creates the first organization for an authenticated Enterprise identity.
 *
 * Social providers create an identity and session, not an organization. This
 * route bridges that intentionally separated provider step to the platform's
 * durable organization bootstrap, which creates the super-admin membership and
 * provisions the Enterprise app through the authenticated app credential.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (session.user.realm !== 'enterprise' && !session.user.crossRealm)
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalidOrganization()
  }

  const parsed = organizationBootstrapInputSchema.safeParse(body)
  if (!parsed.success) return invalidOrganization()

  const user = await findAuthRoutingUser(session.user.id)
  if (!user)
    return apiJson(
      { error: 'Your session is no longer valid. Please sign in again.' },
      { status: 401, code: 'auth/session-invalid' }
    )

  const platform = await getPlatformClient()
  const memberships = await platform.memberships.listRouting({
    userId: user.id,
  })
  if (memberships.error)
    return apiJson(
      { error: 'Unable to verify your workspace. Please try again.' },
      { status: 502, code: memberships.error.code }
    )

  const existing = memberships.data.data[0]
  if (existing) return response(existing.organization.id)

  const organization = await platform.organizations.create({
    creatorUserId: user.id,
    name: parsed.data.name,
  })
  if (organization.error) {
    if (organization.error.code === 'user/not-found')
      return apiJson(
        { error: 'Your session is no longer valid. Please sign in again.' },
        { status: 401, code: 'auth/session-invalid' }
      )

    const status =
      organization.error.code === 'organization/duplicate-slug' ? 409 : 502
    return apiJson(
      { error: organization.error.message },
      { status, code: organization.error.code }
    )
  }

  return response(organization.data.id)
}

function invalidOrganization(): Response {
  return apiJson(
    { error: 'Enter a workspace name.' },
    { status: 422, code: 'organization/validation-failed' }
  )
}

function response(organizationId: string): Response {
  const data: OrganizationBootstrapResult = {
    object: 'onboarding_organization',
    organization_id: organizationId,
  }
  return apiJson({ data })
}
