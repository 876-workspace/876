import 'server-only'

import { apiJson } from '@876/core/api'
import type { PlatformOnboardingTargetType } from '@876/core/platform'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { ONBOARDING_COUNTRY, ORGANIZATION_TARGET_KEY } from '@/lib/onboarding'

export const runtime = 'nodejs'

const AnswersSchema = z.strictObject({
  target: z.enum(['organization', 'application']),
  answers: z.record(z.string(), z.unknown()),
})

export async function PUT(request: NextRequest) {
  const ctx = await getManageContext()
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role === 'member')
    return apiJson({ error: 'Insufficient permissions' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = AnswersSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid onboarding answers.' }, { status: 422 })

  const targetType: PlatformOnboardingTargetType = parsed.data.target
  const targetKey =
    parsed.data.target === 'organization'
      ? ORGANIZATION_TARGET_KEY
      : COURIERS_APP_SLUG

  const platform = await getPlatformClient()
  const result = await platform.onboarding.replaceAnswers(
    ctx.orgId,
    targetType,
    targetKey,
    {
      countryCode: ONBOARDING_COUNTRY,
      answers: parsed.data.answers,
    }
  )

  if (result.error)
    return apiJson({ error: 'Failed to save answers.' }, { status: 500 })

  return apiJson({ data: result.data })
}
