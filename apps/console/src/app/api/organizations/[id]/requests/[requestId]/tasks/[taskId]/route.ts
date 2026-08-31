import type { CrmOperatorClient } from '@876/crm/operator'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsoleCrmPermission } from '@/lib/auth/route-guard'
import { createCrm } from '@/lib/services/crm'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ id: string; requestId: string; taskId: string }>
}
type RequestTasksResource = CrmOperatorClient['requestTasks']
type UpdateRequestTaskInput = Parameters<RequestTasksResource['update']>[3]
type DeleteNestedRequestInput = Parameters<RequestTasksResource['delete']>[3]

export async function PATCH(request: NextRequest, context: Context) {
  const { id: organizationId, requestId, taskId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'tasks.edit'
  )
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestTasks.update(
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
  const { id: organizationId, requestId, taskId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'tasks.delete'
  )
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestTasks.delete(
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
