import 'server-only'

import { apiError, apiSuccess } from '@876/core/api'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/services/platform'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'
const ORGANIZATION_CONFLICT_CODES = new Set([
  'organization/duplicate-slug',
  'auth/organization-slug-taken',
  'organization/provider-conflict',
])

const organizationSchema = z.strictObject({
  name: z.string().trim().min(1),
  // The organization operates in exactly one currency and language. They are
  // chosen here, at creation, and every product app inherits them.
  currency_code: z.string().trim().length(3),
  language: z.string().trim().min(2).max(8),
})

/**
 * Creates the organization for a signed-in 876 account that has no membership
 * yet — the brand-new-signup case (including social sign-up). Billing is an
 * enterprise-realm app, so a fresh account with no org has nowhere to land; this
 * bootstraps the owner's organization so `/get-started` can then provision the
 * Billing workspace. Idempotent: an account that already belongs to an org keeps
 * that org rather than creating a second one.
 */
export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiError('Sign in to continue.', { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid organization details.', { status: 422 })
  }

  const parsed = organizationSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Invalid organization details.', { status: 422 })

  const platform = await getPlatformClient()
  const memberships = await platform.memberships.listRouting({
    userId: session.user.id,
  })
  if (memberships.error)
    return apiError('Failed to verify your account.', { status: 500 })

  const existingOrgId = memberships.data.data[0]?.organization.id
  if (existingOrgId)
    return apiSuccess({
      object: 'onboarding_organization',
      organization_id: existingOrgId,
    })

  const organization = await platform.organizations.create({
    ownerUserId: session.user.id,
    name: parsed.data.name,
    currencyCode: parsed.data.currency_code.toUpperCase(),
    language: parsed.data.language,
  })
  if (organization.error) {
    if (organization.error.code === 'user/not-found') {
      const cookieStore = await cookies()
      cookieStore.delete(SESSION_COOKIE_NAME)

      return apiError(
        'Your session is no longer valid. Please sign in again.',
        {
          status: 401,
          code: 'auth/session-invalid',
        }
      )
    }

    const status = ORGANIZATION_CONFLICT_CODES.has(organization.error.code)
      ? 409
      : 502

    return apiError(organization.error.message, {
      status,
      code: organization.error.code,
    })
  }

  return apiSuccess({
    object: 'onboarding_organization',
    organization_id: organization.data.id,
  })
}
