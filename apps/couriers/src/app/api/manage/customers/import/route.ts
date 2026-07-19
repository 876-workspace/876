import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { getManageContext } from '@/lib/auth/manage-context'
import { getFinanceClient } from '@/lib/finance/client'
import { customerImportRequestSchema } from '@/types/customer-management'

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
    return apiJson({ error: 'Invalid customer import.' }, { status: 400 })
  }

  const parsed = customerImportRequestSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Invalid customer import.' }, { status: 400 })

  const finance = await getFinanceClient()
  let result
  if (parsed.data.dryRun) {
    result = await finance.customers.import(ctx.orgId, parsed.data)
  } else {
    const { idempotencyKey, ...params } = parsed.data
    result = await finance.customers.import(ctx.orgId, params, {
      idempotencyKey,
    })
  }

  return apiJson(result, result.error ? { status: 502 } : undefined)
}
