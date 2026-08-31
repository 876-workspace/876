import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { couriersErrorStatus, toCouriersTenant } from '@/lib/couriers'
import { couriersOperator } from '@/lib/services/couriers'

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

  const result = await couriersOperator.tenants.update(ctx.tenant.id, {
    mailbox_prefix: prefix,
  })
  if (result.error) {
    return apiJson(
      { error: result.error.message },
      { status: couriersErrorStatus(result.error), code: result.error.code }
    )
  }

  return apiJson({
    object: 'tenant',
    ...toCouriersTenant(result.data),
  })
}
