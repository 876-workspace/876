import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = { params: Promise<{ categoryId: string }> }

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
  if (code === 'crm/category-not-found') return 404
  if (code === 'crm/category-in-use') return 409
  return 400
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { categoryId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >
  const input = { ...body }
  delete input.createdBy
  delete input.addedBy
  delete input.deletedBy
  const $876 = await get876Client()

  const result = await $876.requestCategories.update(
    context.orgId,
    categoryId,
    input as never
  )

  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function DELETE(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { categoryId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as {
    reason?: string
  }
  const $876 = await get876Client()

  const result = await $876.requestCategories.delete(
    context.orgId,
    categoryId,
    { deletedBy: context.userId, reason: body.reason }
  )

  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}
