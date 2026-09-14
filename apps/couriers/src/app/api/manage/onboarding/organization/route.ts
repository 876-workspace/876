import 'server-only'

import { apiJson } from '@876/core/api'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/services/platform'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { errorResponse } from '@/lib/errors'
import { ONBOARDING_COUNTRY, ORGANIZATION_TARGET_KEY } from '@/lib/onboarding'

export const runtime = 'nodejs'

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? '876-session'
const organizationSchema = z.strictObject({
  name: z.string().trim().min(1),
  answers: z.record(z.string(), z.unknown()),
})

export async function POST(request: NextRequest) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) return errorResponse('auth/no-session')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('onboarding/invalid-organization')
  }

  const parsed = organizationSchema.safeParse(body)
  if (!parsed.success) return errorResponse('onboarding/invalid-organization')

  const platform = await getPlatformClient()
  const memberships = await platform.memberships.listRouting({
    userId: session.user.id,
  })
  if (memberships.error) return errorResponse('onboarding/verification-failed')
  let organizationId = memberships.data.data[0]?.organization.id
  if (!organizationId) {
    const organization = await platform.organizations.create({
      creatorUserId: session.user.id,
      name: parsed.data.name,
    })
    if (organization.error) {
      if (organization.error.code === 'user/not-found') {
        const cookieStore = await cookies()
        cookieStore.delete(SESSION_COOKIE_NAME)

        return errorResponse('auth/invalid-session')
      }

      return errorResponse(organization.error.code)
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
  if (answers.error) return errorResponse(answers.error.code)

  return apiJson({
    data: {
      object: 'onboarding_organization',
      organization_id: organizationId,
    },
  })
}
