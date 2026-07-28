import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

const updateSchema = z.strictObject({
  orgSlug: z.string().min(1),
  values: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])),
})

type RouteContext = { params: Promise<{ moduleKey: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const orgSlug = request.nextUrl.searchParams.get('orgSlug')
  if (!orgSlug)
    return apiJson({ error: 'Organization is required.' }, { status: 422 })

  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to view settings.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { moduleKey } = await context.params
  const data = await service.preferences.retrieve({
    tenantId: ctx.tenant.id,
    module: moduleKey,
  })
  if (!data) return apiJson({ error: 'Unknown module.' }, { status: 404 })

  return apiJson({ data })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid preferences.' }, { status: 422 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid preferences.' }, { status: 422 })

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to edit settings.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const { moduleKey } = await context.params
  const result = await service.preferences.update({
    tenantId: ctx.tenant.id,
    module: moduleKey,
    values: parsed.data.values,
    updatedBy: ctx.userId,
  })
  if (result.error)
    return apiJson({ error: result.error }, { status: result.status })

  return apiJson({ data: result.data })
}
