import type { CrmOperatorClient } from '@876/crm/operator'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsoleCrmPermission } from '@/lib/auth/route-guard'
import { createCrm } from '@/lib/clients/crm'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ id: string; requestId: string; reminderId: string }>
}
type RequestRemindersResource = CrmOperatorClient['requestReminders']
type UpdateRequestReminderInput = Parameters<
  RequestRemindersResource['update']
>[3]
type DeleteNestedRequestInput = Parameters<
  RequestRemindersResource['delete']
>[3]

export async function PATCH(request: NextRequest, context: Context) {
  const { id: organizationId, requestId, reminderId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'reminders.edit'
  )
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestReminders.update(
    organizationId,
    requestId,
    reminderId,
    body as UpdateRequestReminderInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update request reminder.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id: organizationId, requestId, reminderId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'reminders.delete'
  )
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestReminders.delete(
    organizationId,
    requestId,
    reminderId,
    body as DeleteNestedRequestInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete request reminder.' },
      { status: 400 }
    )

  return apiJson({ data })
}
