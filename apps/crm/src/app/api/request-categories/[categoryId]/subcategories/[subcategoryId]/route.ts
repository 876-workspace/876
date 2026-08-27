import type { NextRequest } from 'next/server'

import { get876Client } from '@/lib/876'
import { getCrmApiContext } from '@/lib/auth/api-context'

type Context = {
  params: Promise<{ categoryId: string; subcategoryId: string }>
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

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { categoryId, subcategoryId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >
  const input = { ...body }
  delete input.createdBy
  delete input.addedBy
  delete input.deletedBy
  const $876 = await get876Client()

  const result = await $876.requestCategories.subcategories.update(
    context.orgId,
    categoryId,
    subcategoryId,
    input as never
  )

  return Response.json(result, { status: result.error ? 400 : 200 })
}

export async function DELETE(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()

  const { categoryId, subcategoryId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as {
    reason?: string
  }
  const $876 = await get876Client()

  const result = await $876.requestCategories.subcategories.delete(
    context.orgId,
    categoryId,
    subcategoryId,
    { deletedBy: context.userId, reason: body.reason }
  )

  return Response.json(result, { status: result.error ? 400 : 200 })
}
