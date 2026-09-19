import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/clients/crm'

type Context = { params: Promise<{ categoryId: string }> }

export async function POST(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context)
    return Response.json(
      {
        data: null,
        error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
      },
      { status: 401 }
    )

  const { categoryId } = await route.params
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<
    string,
    unknown
  >
  const input = { ...body }
  delete input.createdBy
  delete input.addedBy
  delete input.deletedBy
  const result = await crm.requestCategories.subcategories.create(
    context.orgId,
    categoryId,
    { ...input, createdBy: context.userId } as never
  )

  return Response.json(result, { status: result.error ? 400 : 201 })
}
