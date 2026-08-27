import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { createConsole876Client } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import type { Console876Client } from '@/lib/876'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ id: string; requestId: string; taskId: string }>
}
type RequestTasksResource = Console876Client['requestTasks']
type UpdateRequestTaskInput = Parameters<RequestTasksResource['update']>[3]
type DeleteNestedRequestInput = Parameters<RequestTasksResource['delete']>[3]

export async function PATCH(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId, taskId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestTasks.update(
    organizationId,
    requestId,
    taskId,
    body as UpdateRequestTaskInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update request task.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId, taskId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestTasks.delete(
    organizationId,
    requestId,
    taskId,
    body as DeleteNestedRequestInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete request task.' },
      { status: 400 }
    )

  return apiJson({ data })
}
