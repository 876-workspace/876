import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'
import type { CrmRequestEventUpdateInput } from '@/types/crm'

type Context = { params: Promise<{ requestId: string; eventId: string }> }

function statusFor(code: string | undefined) {
  if (code === 'crm/request-not-found' || code === 'crm/event-not-found') return 404
  return 400
}

function unauthorized() {
  return Response.json(
    { data: null, error: { code: 'crm/unauthorized', message: 'Unauthorized.' } },
    { status: 401 }
  )
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const $876 = await get876Client()
  const { requestId, eventId } = await route.params
  const result = await $876.requestEvents.retrieve(context.orgId, requestId, eventId)
  return Response.json(result, { status: result.error ? statusFor(result.error.code) : 200 })
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const $876 = await get876Client()
  const { requestId, eventId } = await route.params
  const input = (await request.json().catch(() => null)) as CrmRequestEventUpdateInput | null
  if (!input || Object.keys(input).length === 0)
    return Response.json(
      { data: null, error: { code: 'crm/invalid-body', message: 'Nothing to update.' } },
      { status: 400 }
    )
  const result = await $876.requestEvents.update(context.orgId, requestId, eventId, input)
  return Response.json(result, { status: result.error ? statusFor(result.error.code) : 200 })
}

export async function DELETE(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const $876 = await get876Client()
  const { requestId, eventId } = await route.params
  const result = await $876.requestEvents.delete(context.orgId, requestId, eventId, {
    deletedBy: context.userId,
  })
  return Response.json(result, { status: result.error ? statusFor(result.error.code) : 200 })
}
