import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'
import type { CrmRequestEventParticipantCreateInput } from '@/types/crm'

type Context = { params: Promise<{ requestId: string; eventId: string }> }

function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const $876 = await get876Client()
  const { requestId, eventId } = await route.params
  const result = await $876.requestEvents.participants.list(
    context.orgId,
    requestId,
    eventId
  )
  return Response.json(result, { status: result.error ? 400 : 200 })
}

export async function POST(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const $876 = await get876Client()
  const { requestId, eventId } = await route.params
  const input = (await request
    .json()
    .catch(() => null)) as CrmRequestEventParticipantCreateInput | null
  if (!input)
    return Response.json(
      {
        data: null,
        error: {
          code: 'crm/invalid-body',
          message: 'Participant details are required.',
        },
      },
      { status: 400 }
    )
  const result = await $876.requestEvents.participants.create(
    context.orgId,
    requestId,
    eventId,
    input
  )
  return Response.json(result, { status: result.error ? 400 : 201 })
}
