import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PriceListUpdateSchema } from '@/types/price-list'

export const runtime = 'nodejs'
type Context = { params: Promise<{ priceListId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response
  const { priceListId } = await context.params
  const list = await service.priceLists.retrieve(
    access.context.tenant.id,
    priceListId
  )
  if (!list) return apiError('Price list not found.', { status: 404 })
  return apiSuccess(
    Resource('price_list', list as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const { priceListId } = await context.params
  const parsed = PriceListUpdateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid price-list details.', { status: 422 })
  const result = await service.priceLists.update(
    access.context.tenant.id,
    priceListId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('price_list', result.data))
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response
  const { priceListId } = await context.params
  const result = await service.priceLists.delete(
    access.context.tenant.id,
    priceListId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess({ object: 'price_list', id: priceListId, deleted: true })
}
