import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { couriersErrorStatus, toRoleView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { roleCreateParamsSchema } from '@/types/role'

export const runtime = 'nodejs'

const createSchema = roleCreateParamsSchema.extend({
  orgSlug: z.string().min(1),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid role.' }, { status: 422 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid role.' }, { status: 422 })

  const { orgSlug, ...params } = parsed.data
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to create roles.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const $876 = await getCouriers()
  const result = await $876.roles.create(params)
  if (result.error)
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )

  return apiJson({ data: toRoleView(result.data) }, { status: 201 })
}
