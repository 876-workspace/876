import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { createConsole876Client } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import type { Console876Client } from '@/lib/876'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ id: string; requestId: string; reminderId: string }>
}
type RequestRemindersResource = Console876Client['requestReminders']
type UpdateRequestReminderInput = Parameters<
  RequestRemindersResource['update']
>[3]
type DeleteNestedRequestInput = Parameters<
  RequestRemindersResource['delete']
>[3]

export async function PATCH(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId, reminderId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestReminders.update(
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
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId, reminderId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestReminders.delete(
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
