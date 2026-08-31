import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/services/crm'

type Context = { params: Promise<{ requestId: string }> }
function statusFor(code: string | undefined) {
  return code === 'crm/request-not-found' ? 404 : 400
}
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
  const { requestId } = await route.params
  const result = await crm.requests.retrieve(context.orgId, requestId)
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId } = await route.params
  const input = await request.json().catch(() => null)
  const result = await crm.requests.update(
    context.orgId,
    requestId,
    input as never
  )
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function DELETE(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId } = await route.params
  const input = (await request.json().catch(() => ({}))) as {
    reason?: string | null
  }
  const result = await crm.requests.delete(context.orgId, requestId, {
    deletedBy: context.userId,
    reason: input.reason ?? null,
  })
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}
