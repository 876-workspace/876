import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CouponUpdateSchema } from '@/types/discount'

export const runtime = 'nodejs'
type Context = { params: Promise<{ couponId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response
  const { couponId } = await context.params
  const coupon = await service.discounts.coupons.retrieve(
    access.context.tenant.id,
    couponId
  )
  if (!coupon) return apiError('Coupon not found.', { status: 404 })
  return apiSuccess(
    Resource('coupon', coupon as unknown as Record<string, unknown>)
  )
}

export async function PATCH(request: Request, context: Context) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const { couponId } = await context.params
  const parsed = CouponUpdateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid coupon details.', { status: 422 })
  const result = await service.discounts.coupons.update(
    access.context.tenant.id,
    couponId,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('coupon', result.data))
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const { couponId } = await context.params
  const result = await service.discounts.coupons.delete(
    access.context.tenant.id,
    couponId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess({ object: 'coupon', id: couponId, deleted: true })
}
