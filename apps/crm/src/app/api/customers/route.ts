import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

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

  const $876 = await get876Client()

  const result = await $876.customerProfiles.list(context.orgId)
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

  const $876 = await get876Client()

  const result = await $876.customerProfiles.create(context.orgId, {
    ...(input as Record<string, unknown>),
    idempotencyKey,
  } as never)

  return Response.json(result, { status: result.error ? 400 : 201 })
}
