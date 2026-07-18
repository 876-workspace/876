import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionResumeSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]/resume'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const parsed = SubscriptionResumeSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid resume details.', { status: 422 })
  const { subscriptionId } = await context.params
  const result = await service.subscriptions.resume(
    access.context.tenant.id,
    subscriptionId,
    parsed.data,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('subscription_schedule', result.data), {
    status: 201,
  })
}
