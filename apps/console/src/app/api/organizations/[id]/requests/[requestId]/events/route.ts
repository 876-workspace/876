import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { createConsole876Client } from '@/lib/876'
import {
  requireConsoleCrmPermission,
  requireConsolePermission,
} from '@/lib/auth/route-guard'
import type { Console876Client } from '@/lib/876'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; requestId: string }> }
type RequestEventsResource = Console876Client['requestEvents']
type CreateRequestEventInput = Parameters<RequestEventsResource['create']>[2]
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never
type BrowserCreateRequestEventInput = DistributiveOmit<
  CreateRequestEventInput,
  'createdBy'
>

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId } = await context.params
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestEvents.list(
    organizationId,
    requestId
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to list request events.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function POST(request: NextRequest, context: Context) {
  const { id: organizationId, requestId } = await context.params
  const { response, sessionUser } = await requireConsoleCrmPermission(
    organizationId,
    'events.create'
  )
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const input = body as BrowserCreateRequestEventInput
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestEvents.create(
    organizationId,
    requestId,
    { ...input, createdBy: sessionUser.id } as CreateRequestEventInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create request event.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
