import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toRoleView } from '@/lib/couriers'
import { getCouriers } from '@/lib/clients/couriers'
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
    return errorResponse('role/invalid')
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return errorResponse('role/invalid')

  const { orgSlug, ...params } = parsed.data
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const $876 = await getCouriers()
  const result = await $876.roles.create(params)
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: toRoleView(result.data) }, { status: 201 })
}
