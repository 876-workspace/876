import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/services/platform'
import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { getAppError } from '@/lib/errors'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'

export const runtime = 'nodejs'

const InvitesSchema = z.strictObject({
  invites: z
    .array(
      z.strictObject({
        email: z.string().trim().pipe(z.email()),
        role: z.enum(['staff', 'admin']).optional(),
      })
    )
    .min(1)
    .max(10),
})

export async function POST(request: NextRequest) {
  const ctx = await getManageContext()
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role === 'staff') return errorResponse('auth/forbidden')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('request/invalid-json')
  }

  const parsed = InvitesSchema.safeParse(body)
  if (!parsed.success) return errorResponse('onboarding/invalid-invites')

  const platform = await getPlatformClient()
  const results = []

  for (const invite of parsed.data.invites) {
    const result = await platform.invites.create(ctx.orgId, {
      email: invite.email,
      role: invite.role,
      sourceAppSlug: COURIERS_APP_SLUG,
    })

    results.push(
      result.error
        ? {
            email: invite.email,
            ok: false,
            error: getAppError(result.error.code).message,
          }
        : { email: invite.email, ok: true }
    )
  }

  return apiJson({
    data: {
      object: 'invite_batch',
      results,
    },
  })
}
