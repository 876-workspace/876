import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { getManageContext } from '@/lib/auth/manage-context'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

const toggleSchema = z.strictObject({
  orgSlug: z.string().min(1),
  module: z.string().min(1),
  isEnabled: z.boolean(),
})

export async function GET(request: NextRequest) {
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

  const data = await service.modules.list({ tenantId: ctx.tenant.id })

  return apiJson({ data })
}

export async function PATCH(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid module state.' }, { status: 422 })
  }

  const parsed = toggleSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid module state.' }, { status: 422 })

  const ctx = await getManageContext(parsed.data.orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role !== 'owner' && ctx.role !== 'admin')
    return apiJson(
      { error: 'You do not have permission to edit settings.' },
      { status: 403, code: 'auth/forbidden' }
    )
  if (!ctx.tenant)
    return apiJson({ error: 'Tenant not found.' }, { status: 404 })

  const result = await service.modules.toggle({
    tenantId: ctx.tenant.id,
    module: parsed.data.module,
    isEnabled: parsed.data.isEnabled,
  })
  if (result.error)
    return apiJson({ error: result.error }, { status: result.status })

  return apiJson({ data: result.data })
}
