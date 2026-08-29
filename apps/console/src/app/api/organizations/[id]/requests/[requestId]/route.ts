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
type RequestsResource = Console876Client['requests']
type UpdateRequestInput = Parameters<RequestsResource['update']>[2]
type DeleteInput = Parameters<RequestsResource['delete']>[2]

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId } = await context.params
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requests.retrieve(
    organizationId,
    requestId
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to retrieve request.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function PATCH(request: NextRequest, context: Context) {
  const { id: organizationId, requestId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'requests.edit'
  )
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requests.update(
    organizationId,
    requestId,
    body as UpdateRequestInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update request.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id: organizationId, requestId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'requests.delete'
  )
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requests.delete(
    organizationId,
    requestId,
    body as DeleteInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete request.' },
      { status: 400 }
    )

  return apiJson({ data })
}
