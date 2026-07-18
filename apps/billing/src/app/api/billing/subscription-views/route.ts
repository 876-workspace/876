import {
  apiError,
  apiSuccess,
  List,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionCustomViewCreateSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response
  const views = await service.subscriptions.views.list(
    access.context.tenant.id,
    access.context.userId
  )
  return apiSuccess(
    List('/api/v1/subscription-views', views, 'subscription_view')
  )
}

export async function POST(request: Request) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response
  const parsed = SubscriptionCustomViewCreateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid view details.', { status: 422 })
  const result = await service.subscriptions.views.create(
    access.context.tenant.id,
    parsed.data,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })
  return apiSuccess(Resource('subscription_view', result.data), { status: 201 })
}
