import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = { params: Promise<{ requestId: string }> }

function statusFor(code: string | undefined) {
  return code === 'crm/request-not-found' ? 404 : 400
}

export async function GET(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const $876 = await get876Client()

  const { requestId } = await route.params
  const result = await $876.requests.retrieve(context.orgId, requestId)
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const { requestId } = await route.params
  const $876 = await get876Client()

  const input = await request.json().catch(() => null)
  const result = await $876.requests.update(
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
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const { requestId } = await route.params
  const $876 = await get876Client()

  const input = (await request.json().catch(() => ({}))) as {
    reason?: string | null
  }
  const result = await $876.requests.delete(context.orgId, requestId, {
    deletedBy: context.userId,
    reason: input.reason ?? null,
  })
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}
