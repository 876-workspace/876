import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { errorResponse } from '@/lib/errors'
import { toCouriersTenant } from '@/lib/couriers'
import { couriersOperator } from '@/lib/clients/couriers'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest) {
  const ctx = await getManageContext()
  if (!ctx) return errorResponse('auth/no-session')
  if (!ctx.tenant) return errorResponse('tenant/not-found')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('request/invalid-json')
  }

  const raw = (body as Record<string, unknown>).prefix
  const prefix =
    typeof raw === 'string' ? raw.trim().toUpperCase() || null : null

  const result = await couriersOperator.tenants.update(ctx.tenant.id, {
    mailbox_prefix: prefix,
  })
  if (result.error) return errorResponse(result.error.code)

  return apiJson({
    object: 'tenant',
    ...toCouriersTenant(result.data),
  })
}
