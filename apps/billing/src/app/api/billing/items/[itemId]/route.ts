import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { ItemUpdateSchema } from '@/types/item'

export const runtime = 'nodejs'

type Context = { params: Promise<{ itemId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const { itemId } = await context.params
  const row = await service.items.retrieve(access.context.tenant.id, itemId)
  if (!row) return apiError('Item not found.', { status: 404 })

  return apiSuccess(Resource('item', row as unknown as Record<string, unknown>))
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { itemId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = ItemUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid item details.', { status: 422 })

  const result = await service.items.update(
    access.context.tenant.id,
    itemId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('item', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { itemId } = await context.params
  const result = await service.items.delete(access.context.tenant.id, itemId)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'item', id: itemId, deleted: true })
}
