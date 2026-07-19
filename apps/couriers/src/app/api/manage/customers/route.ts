import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'
import { customerCreateSchema } from '@/types/customer-management'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const orgSlug = request.headers.get('x-876-org-slug') ?? undefined
  const ctx = await getManageContext(orgSlug)
  if (!ctx) return apiJson({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.role === 'member' || ctx.accessStatus !== 'active' || !ctx.tenant)
    return apiJson({ error: 'Insufficient permissions.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiJson({ error: 'Invalid customer.' }, { status: 400 })
  }

  const parsed = customerCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid customer.' }, { status: 400 })

  const finance = await getFinanceClient()
  const result = await finance.customers.create(ctx.orgId, parsed.data, {
    idempotencyKey: crypto.randomUUID(),
  })

  return apiJson(result, result.error ? { status: 502 } : undefined)
}
