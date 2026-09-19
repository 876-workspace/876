import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getPlatformClient } from '@/lib/clients/platform'
import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { COURIERS_APP_SLUG } from '@/lib/couriers-app'
import { getCouriers } from '@/lib/clients/couriers'

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
    return errorResponse('team/invalid-invite')
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) return errorResponse('team/invalid-invite')

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const $876 = await getCouriers()
  const roleResult = await $876.roles.retrieve(parsed.data.roleId)
  if (roleResult.error) {
    if (roleResult.error.code.endsWith('/not-found'))
      return errorResponse('role/not-found')
    return errorResponse(roleResult.error.code)
  }

  const platform = await getPlatformClient()
  const result = await platform.invites.create(ctx.orgId, {
    email: parsed.data.email,
    role: roleResult.data.system_key === 'admin' ? 'admin' : 'staff',
    sourceAppSlug: COURIERS_APP_SLUG,
  })
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: result.data }, { status: 201 })
}
