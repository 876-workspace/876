import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/services/crm'

export async function GET(request: NextRequest) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      { data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } },
      { status: 401 }
    )

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') ?? undefined
  const teamId = searchParams.get('teamId') ?? undefined
  const assigneeId = searchParams.get('assigneeId') ?? undefined
  const customerId = searchParams.get('customerId') ?? undefined
  const result = await crm.requests.list(context.orgId, {
    status: status as never,
    teamId,
    assigneeId,
    customerId,
  })
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
  const result = await crm.requests.create(context.orgId, {
    ...(input as Record<string, unknown>),
    createdBy: context.userId,
  } as never)
  return Response.json(result, { status: result.error ? 400 : 201 })
}
