import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { createConsole876Client } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import type { Console876Client } from '@/lib/876'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; requestId: string }> }
type CreateRequestTaskInput = Parameters<
  Console876Client['requestTasks']['create']
>[2]

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId } = await context.params
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestTasks.list(
    organizationId,
    requestId
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to list request tasks.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestTasks.create(
    organizationId,
    requestId,
    body as CreateRequestTaskInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create request task.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
