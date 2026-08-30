import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/services/crm'
import type { CrmRequestEventParticipantUpdateInput } from '@/types/crm'

type Context = { params: Promise<{ requestId: string; eventId: string; participantId: string }> }
function unauthorized() { return Response.json({ data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } }, { status: 401 }) }

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext(); if (!context) return unauthorized()
  const { requestId, eventId, participantId } = await route.params
  const input = (await request.json().catch(() => null)) as CrmRequestEventParticipantUpdateInput | null
  if (!input || Object.keys(input).length === 0) return Response.json({ data: null, error: { code: 'crm/invalid-body', message: 'Nothing to update.' } }, { status: 400 })
  const result = await crm.requestEvents.participants.update(context.orgId, requestId, eventId, participantId, input)
  return Response.json(result, { status: result.error ? 400 : 200 })
}

export async function DELETE(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext(); if (!context) return unauthorized()
  const { requestId, eventId, participantId } = await route.params
  const result = await crm.requestEvents.participants.delete(context.orgId, requestId, eventId, participantId)
  return Response.json(result, { status: result.error ? 400 : 200 })
}
