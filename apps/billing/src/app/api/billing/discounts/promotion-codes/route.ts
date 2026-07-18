import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { PromotionCodeCreateSchema } from '@/types/discount'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response

  const rows = await service.discounts.promotionCodes.list(
    access.context.tenant.id
  )
  return apiSuccess(
    List(
      '/api/v1/discounts/promotion-codes',
      rows as unknown as Array<Record<string, unknown>>,
      'promotion_code'
    )
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = PromotionCodeCreateSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid promotion-code details.', { status: 422 })

  const result = await service.discounts.promotionCodes.create(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('promotion_code', result.data), { status: 201 })
}
