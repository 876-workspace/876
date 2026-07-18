import 'server-only'

import { apiJson } from '@876/core/api'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { ONBOARDING_COUNTRY, ORGANIZATION_TARGET_KEY } from '@/lib/onboarding'

export const runtime = 'nodejs'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'
const ORGANIZATION_CONFLICT_CODES = new Set([
  'organization/duplicate-slug',
  'auth/organization-slug-taken',
  'organization/provider-conflict',
])

const organizationSchema = z.strictObject({
  name: z.string().trim().min(1),
  answers: z.record(z.string(), z.unknown()),
})

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    return apiJson({ error: 'Unauthorized.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson(
      { error: 'Invalid onboarding organization.' },
      { status: 422 }
    )
  }

  const parsed = organizationSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Invalid onboarding organization.' },
      { status: 422 }
    )

  const platform = await getPlatformClient()
  const memberships = await platform.auth.getRoutingMemberships({
    userId: session.user.id,
  })
  if (memberships.error)
    return apiJson({ error: 'Failed to verify workspace.' }, { status: 500 })
  let organizationId = memberships.data.data[0]?.organization.id
  if (!organizationId) {
    const organization = await platform.orgs.create({
      ownerUserId: session.user.id,
      name: parsed.data.name,
    })
    if (organization.error) {
      if (organization.error.code === 'user/not-found') {
        const cookieStore = await cookies()
        cookieStore.delete(SESSION_COOKIE_NAME)

        return apiJson(
          { error: 'Your session is no longer valid. Please sign in again.' },
          { status: 401, code: 'auth/session-invalid' }
        )
      }

      const status = ORGANIZATION_CONFLICT_CODES.has(organization.error.code)
        ? 409
        : 502

      return apiJson(
        { error: organization.error.message },
        { status, code: organization.error.code }
      )
    }
    organizationId = organization.data.id
  }

  const answers = await platform.onboarding.replaceAnswers(
    organizationId,
    'organization',
    ORGANIZATION_TARGET_KEY,
    {
      countryCode: ONBOARDING_COUNTRY,
      answers: parsed.data.answers,
    }
  )
  if (answers.error)
    return apiJson({ error: answers.error.message }, { status: 500 })

  return apiJson({
    data: {
      object: 'onboarding_organization',
      organization_id: organizationId,
    },
  })
}
