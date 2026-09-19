import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/clients/crm'

export async function GET() {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const result = await crm.customers.list(context.orgId)
  return Response.json(result, { status: result.error ? 502 : 200 })
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const input = await request.json().catch(() => null)
  const idempotencyKey = request.headers.get('x-idempotency-key')?.trim()
  if (!idempotencyKey)
    return Response.json(
      {
        data: null,
        error: {
          code: 'crm/idempotency-key-required',
          message: 'Missing idempotency key.',
        },
      },
      { status: 400 }
    )

  const result = await crm.customers.create(context.orgId, {
    ...(input as Record<string, unknown>),
    idempotencyKey,
  } as never)

  return Response.json(result, { status: result.error ? 400 : 201 })
}
