import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionCustomViewCreateSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function PUT(
  request: Request,
  context: RouteContext<'/api/billing/subscription-views/[viewId]'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const parsed = SubscriptionCustomViewCreateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid view details.', { status: 422 })
  const { viewId } = await context.params
  const result = await service.subscriptions.views.update(
    access.context.tenant.id,
    viewId,
    parsed.data,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('subscription_view', result.data))
}

export async function DELETE(
  _request: Request,
  context: RouteContext<'/api/billing/subscription-views/[viewId]'>
) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const { viewId } = await context.params
  const result = await service.subscriptions.views.delete(
    access.context.tenant.id,
    viewId,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(
    Resource('subscription_view', { ...result.data, deleted: true })
  )
}
