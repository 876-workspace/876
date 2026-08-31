import { billing } from '@/lib/services/billing'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Creates a finance customer for the selected organization. */
export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(requestId)
  const { data, error } = await billing.customers.create(organizationId, body, {
    idempotencyKey: `console:${requestId}`,
  })
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create finance customer.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
