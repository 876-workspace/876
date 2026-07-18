import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'

export const runtime = 'nodejs'

const InvitesSchema = z.strictObject({
  invites: z
    .array(
      z.strictObject({
        email: z.string().trim().pipe(z.email()),
        role: z.enum(['member', 'admin']).optional(),
      })
    )
    .min(1)
    .max(10),
})

export async function POST(request: NextRequest) {
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

  const parsed = InvitesSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Provide valid invite emails.' }, { status: 422 })

  const platform = await getPlatformClient()
  const results = []

  for (const invite of parsed.data.invites) {
    const result = await platform.orgs.invites.create(ctx.orgId, {
      email: invite.email,
      role: invite.role,
      sourceAppSlug: COURIERS_APP_SLUG,
    })

    results.push(
      result.error
        ? { email: invite.email, ok: false, error: result.error.message }
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
