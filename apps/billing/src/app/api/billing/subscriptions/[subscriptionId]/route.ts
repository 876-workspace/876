import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const { subscriptionId } = await context.params
  const result = await service.subscriptions.delete(
    access.context.tenant.id,
    subscriptionId,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('subscription', { ...result.data, deleted: true }))
}
