import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionAmendmentCreateSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]/amendments'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const parsed = SubscriptionAmendmentCreateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid subscription changes.', { status: 422 })
  const { subscriptionId } = await context.params
  const result = await service.subscriptions.amendments.create(
    access.context.tenant.id,
    subscriptionId,
    parsed.data,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('subscription_amendment', result.data), {
    status: 201,
  })
}
