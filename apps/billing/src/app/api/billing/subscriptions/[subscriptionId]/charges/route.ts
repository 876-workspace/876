import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionChargeCreateSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]/charges'>
) {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response
  const { subscriptionId } = await context.params
  const charges = await service.subscriptions.charges.list(
    access.context.tenant.id,
    subscriptionId
  )
  return apiSuccess(
    List(
      `/api/v1/subscriptions/${subscriptionId}/charges`,
      charges,
      'subscription_charge'
    )
  )
}

export async function POST(
  request: Request,
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]/charges'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const parsed = SubscriptionChargeCreateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid charge details.', { status: 422 })
  const { subscriptionId } = await context.params
  const result = await service.subscriptions.charges.create(
    access.context.tenant.id,
    subscriptionId,
    parsed.data,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('subscription_charge', result.data), {
    status: 201,
  })
}
