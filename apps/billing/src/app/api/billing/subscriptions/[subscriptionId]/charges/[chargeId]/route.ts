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
  context: RouteContext<'/api/billing/subscriptions/[subscriptionId]/charges/[chargeId]'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const { subscriptionId, chargeId } = await context.params
  const result = await service.subscriptions.charges.void(
    access.context.tenant.id,
    subscriptionId,
    chargeId,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(
    Resource('subscription_charge', { ...result.data, voided: true })
  )
}
