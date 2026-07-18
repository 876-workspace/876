import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { CouponCreateSchema } from '@/types/discount'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response

  const status = new URL(request.url).searchParams.get('status')
  const isActive =
    status === 'active' ? true : status === 'archived' ? false : undefined
  const rows = await service.discounts.coupons.list(
    access.context.tenant.id,
    isActive
  )
  return apiSuccess(
    List(
      '/api/v1/discounts/coupons',
      rows as unknown as Array<Record<string, unknown>>,
      'coupon'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = CouponCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid coupon details.', { status: 422 })

  const result = await service.discounts.coupons.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('coupon', result.data), { status: 201 })
}
