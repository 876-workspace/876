import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { service } from '@/lib/service'
import { getManageContext } from '@/lib/auth/manage-context'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest) {
  const ctx = await getManageContext()
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (!ctx.tenant) return apiJson({ error: 'No tenant.' }, { status: 404 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const raw = (body as Record<string, unknown>).prefix
  const prefix =
    typeof raw === 'string' ? raw.trim().toUpperCase() || null : null

  const result = await service.tenants.update(ctx.tenant.id, {
    mailboxPrefix: prefix,
  })
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status })
  }

  return apiJson({
    object: 'tenant',
    id: ctx.tenant.id,
    ...result.data,
  })
}
