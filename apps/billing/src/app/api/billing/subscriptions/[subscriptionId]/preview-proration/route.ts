import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionProrationPreviewSchema } from '@/types/subscription'

export const runtime = 'nodejs'

type Context = { params: Promise<{ subscriptionId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response

  const { subscriptionId } = await context.params
  const body = await request.json().catch(() => null)
  const parsed = SubscriptionProrationPreviewSchema.safeParse(body)
  if (!parsed.success)
    return apiError('Enter valid subscription change details.', { status: 422 })

  const preview = await service.subscriptions.previewProration(
    access.context.tenant.id,
    subscriptionId,
    parsed.data
  )
  if (!preview) return apiError('Subscription not found.', { status: 404 })
  if (preview.error) return apiError(preview.error, { status: 422 })

  return apiSuccess(preview)
}
