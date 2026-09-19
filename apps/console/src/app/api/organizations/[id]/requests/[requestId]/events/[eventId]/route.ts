import type { CrmOperatorClient } from '@876/crm/operator'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsoleCrmPermission } from '@/lib/auth/route-guard'
import { createCrm } from '@/lib/clients/crm'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ id: string; requestId: string; eventId: string }>
}
type RequestEventsResource = CrmOperatorClient['requestEvents']
type UpdateRequestEventInput = Parameters<RequestEventsResource['update']>[3]
type DeleteRequestEventInput = Parameters<RequestEventsResource['delete']>[3]

export async function PATCH(request: NextRequest, context: Context) {
  const { id: organizationId, requestId, eventId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'events.edit'
  )
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0)
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestEvents.update(
    organizationId,
    requestId,
    eventId,
    body as UpdateRequestEventInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update request event.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const { id: organizationId, requestId, eventId } = await context.params
  const { response, sessionUser } = await requireConsoleCrmPermission(
    organizationId,
    'events.delete'
  )
  if (response) return response

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestEvents.delete(
    organizationId,
    requestId,
    eventId,
    { deletedBy: sessionUser.id } as DeleteRequestEventInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete request event.' },
      { status: 400 }
    )

  return apiJson({ data })
}
