import {
  apiError,
  apiSuccess,
  Resource,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionBulkInvoiceModeSchema } from '@/types/subscription'

export const runtime = 'nodejs'

export async function PATCH(request: Request) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response

  const parsed = SubscriptionBulkInvoiceModeSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!parsed.success)
    return apiError('Select subscriptions and an invoice preference.', {
      status: 422,
    })

  const result = await service.subscriptions.preferences.bulkUpdateInvoiceMode(
    access.context.tenant.id,
    parsed.data,
    access.context.userId
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  return apiSuccess(Resource('subscription_bulk_update', result.data))
}
