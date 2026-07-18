import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { getBillingIntegrationClient } from '@/lib/billing'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Creates a customer through Billing's official organization integration API. */
export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { organizationId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const billingIntegration = getBillingIntegrationClient(requestId)
  const { data, error } = await billingIntegration.customers.create(
    organizationId,
    body,
    { idempotencyKey: `console:${requestId}` }
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create Billing customer.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
