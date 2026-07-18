import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PriceUpdateSchema } from '@/types/price'

export const runtime = 'nodejs'

type Context = { params: Promise<{ priceId: string }> }

export async function GET(request: Request, context: Context) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response

  const { priceId } = await context.params
  const row = await service.prices.retrieve(access.context.tenant.id, priceId)
  if (!row) return apiError('Price not found.', { status: 404 })

  return apiSuccess(
    Resource('price', row as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { priceId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = PriceUpdateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid price details.', { status: 422 })

  const result = await service.prices.update(
    access.context.tenant.id,
    priceId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('price', result.data))
}

export async function DELETE(request: Request, context: Context) {
  const access = await requirePermission('catalog:write')
  if (access.response) return access.response

  const { priceId } = await context.params
  const result = await service.prices.delete(access.context.tenant.id, priceId)
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess({ object: 'price', id: priceId, deleted: true })
}
