import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PriceListResolveSchema } from '@/types/price-list'

export const runtime = 'nodejs'
type Context = { params: Promise<{ priceListId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('catalog:read')
  if (access.response) return access.response
  const { priceListId } = await context.params
  const parsed = PriceListResolveSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter a valid price and quantity.', { status: 422 })
  const resolved = await service.priceLists.resolveAmount(
    access.context.tenant.id,
    parsed.data.priceId,
    parsed.data.quantity,
    priceListId
  )
  if (!resolved) return apiError('Price not found.', { status: 404 })
  return apiSuccess({
    object: 'resolved_price',
    currency: resolved.currency,
    amount: resolved.amount.toString(),
    price_list_id: resolved.priceList?.id ?? null,
  })
}
