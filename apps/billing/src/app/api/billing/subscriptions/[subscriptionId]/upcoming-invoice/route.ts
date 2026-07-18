import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ subscriptionId: string }> }

export async function GET(_request: Request, context: Context) {
  const access = await requirePermission('subscriptions:read')
  if (access.response) return access.response

  const { subscriptionId } = await context.params
  const preview = await service.subscriptions.previewUpcomingInvoice(
    access.context.tenant.id,
    subscriptionId
  )
  if (!preview)
    return apiError('Subscription or billable terms not found.', {
      status: 404,
    })

  return apiSuccess(preview)
}
