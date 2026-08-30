import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = { params: Promise<{ priorityId: string }> }

function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

function statusFor(code: string | undefined) {
  if (code === 'crm/priority-not-found') return 404
  if (
    code === 'crm/priority-default-required' ||
    code === 'crm/priority-in-use'
  )
    return 409
  return 400
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { priorityId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >
  const input = { ...body }
  delete input.createdBy
  delete input.deletedBy
  const $876 = await get876Client()

  const result = await $876.requestPriorities.update(
    context.orgId,
    priorityId,
    input as never
  )

  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function DELETE(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { priorityId } = await route.params
  const $876 = await get876Client()
  const result = await $876.requestPriorities.delete(
    context.orgId,
    priorityId,
    {
      deletedBy: context.userId,
    }
  )

  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}
