import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toRoleView } from '@/lib/couriers'
import { getCouriers } from '@/lib/services/couriers'
import { roleUpdateParamsSchema } from '@/types/role'

export const runtime = 'nodejs'

const updateSchema = roleUpdateParamsSchema.extend({
  orgSlug: z.string().min(1),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('role/invalid')
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return errorResponse('role/invalid')

  const { orgSlug, ...params } = parsed.data
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const { id } = await context.params
  const $876 = await getCouriers()
  const result = await $876.roles.update(id, params)
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: toRoleView(result.data) })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug) return errorResponse('settings/organization-required')

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return errorResponse('auth/no-session')
  if (ctx.role !== 'super-admin' && ctx.role !== 'admin')
    return errorResponse('auth/forbidden')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  const { id } = await context.params
  const $876 = await getCouriers()
  const result = await $876.roles.delete(id)
  if (result.error) return errorResponse(result.error.code)

  return apiJson({ data: { id: result.data.id, deleted: true } })
}
