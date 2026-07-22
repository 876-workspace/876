import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'
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
    return apiJson({ error: 'Invalid role.' }, { status: 422 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid role.' }, { status: 422 })

  const { orgSlug, ...params } = parsed.data
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to update roles.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { id } = await context.params
  const result = await service.roles.update(ctx.tenant.id, id, params)
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug)
    return apiJson({ error: 'Organization is required.' }, { status: 422 })

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to delete roles.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { id } = await context.params
  const result = await service.roles.delete(ctx.tenant.id, id)
  if (result.error)
    return apiJson(
      { error: result.error },
      { status: result.status, code: result.code }
    )

  return apiJson({ data: result.data })
}
