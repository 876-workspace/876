import { z } from 'zod'

import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { ItemCreateSchema } from '@/types/item'

export const runtime = 'nodejs'

const sourceAppIdFilterSchema = z.string().trim().min(1).max(80).optional()

export async function GET(request: Request) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const sourceAppId = sourceAppIdFilterSchema.safeParse(
    new URL(request.url).searchParams.get('sourceAppId') ?? undefined
  )
  if (!sourceAppId.success)
    return apiError('Enter a valid source app filter.', { status: 422 })

  const items = await service.items.list(
    access.context.tenant.id,
    undefined,
    sourceAppId.data
  )
  return apiSuccess(
    List(
      '/api/v1/items',
      items as unknown as Array<Record<string, unknown>>,
      'item'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = ItemCreateSchema.safeParse(body)
  if (!parsed.success) {
    console.warn(
      '[billing.api.items.POST] validation failed',
      parsed.error.issues
    )
    return apiError('Enter valid item details.', { status: 422 })
  }

  const result = await service.items.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('item', result.data), { status: 201 })
}
