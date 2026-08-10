import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/876/platform-client'
import { getManageContext } from '@/lib/auth/manage-context'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { $couriers, couriersErrorStatus } from '@/lib/couriers'

export const runtime = 'nodejs'

const inviteSchema = z.strictObject({
  orgSlug: z.string().min(1),
  email: z.string().trim().pipe(z.email()),
  roleId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid invite.' }, { status: 422 })
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid invite.' }, { status: 422 })

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to invite users.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const roleResult = await $couriers.roles.retrieve(
    ctx.tenant.id,
    parsed.data.roleId
  )
  if (roleResult.error) {
    if (roleResult.error.code.endsWith('/not-found'))
      return apiJson({ error: 'Role not found.' }, { status: 404 })
    return apiJson(
      { error: roleResult.error.message },
      {
        status: couriersErrorStatus(roleResult.error),
        code: roleResult.error.code,
      }
    )
  }

  const platform = await getPlatformClient()
  const result = await platform.invites.create(ctx.orgId, {
    email: parsed.data.email,
    role: roleResult.data.system_key === 'admin' ? 'admin' : 'member',
    sourceAppSlug: COURIERS_APP_SLUG,
  })
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: 502, code: result.error.code }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
