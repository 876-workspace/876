import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionPreferenceUpdateSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response

  const preferences = await service.subscriptions.preferences.retrieve(
    access.context.tenant.id
  )

  return apiSuccess(Resource('subscription_preferences', preferences))
}

export async function PATCH(request: Request) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response

  const parsed = SubscriptionPreferenceUpdateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Enter valid subscription preferences.', { status: 422 })

  const result = await service.subscriptions.preferences.update(
    access.context.tenant.id,
    parsed.data
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('subscription_preferences', result.data))
}
