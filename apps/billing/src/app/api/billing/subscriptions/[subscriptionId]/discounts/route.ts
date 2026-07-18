import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionDiscountCreateSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]/discounts'>
) {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response
  const { subscriptionId } = await context.params
  const discounts = await service.subscriptions.discounts.list(
    access.context.tenant.id,
    subscriptionId
  )
  return apiSuccess(
    List(
      `/api/v1/subscriptions/${subscriptionId}/discounts`,
      discounts,
      'subscription_discount'
    )
  )
}

export async function POST(
  request: Request,
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]/discounts'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const parsed = SubscriptionDiscountCreateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid discount details.', { status: 422 })
  const { subscriptionId } = await context.params
  const result = await service.subscriptions.discounts.create(
    access.context.tenant.id,
    subscriptionId,
    parsed.data,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('subscription_discount', result.data), {
    status: 201,
  })
}
