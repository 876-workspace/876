import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

export async function GET() {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      { data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } },
      { status: 401 }
    )

  const result = await $876.requests.list(context.orgId)
  return Response.json(result, { status: result.error ? 502 : 200 })
}

export async function POST(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      { data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } },
      { status: 401 }
    )

  const input = await request.json().catch(() => null)
  const result = await $876.requests.create(context.orgId, {
    ...(input as Record<string, unknown>),
    createdBy: context.userId,
  } as never)

  return Response.json(result, { status: result.error ? 400 : 201 })
}
