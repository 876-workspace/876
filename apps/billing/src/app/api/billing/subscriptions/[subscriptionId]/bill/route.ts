import {
  apiError,
  apiSuccess,
  requirePermission,
} from '@/lib/api/billing-route'
import { service } from '@/lib/service'
import { SubscriptionManualInvoiceSchema } from '@/types/subscription'

export const runtime = 'nodejs'

type Context = { params: Promise<{ subscriptionId: string }> }

export async function POST(request: Request, context: Context) {
  const access = await requirePermission('subscriptions:write')
  if (access.response) return access.response

  const { subscriptionId } = await context.params
  const body = await request.json().catch(() => ({}))
  const parsed = SubscriptionManualInvoiceSchema.safeParse(body)
  if (!parsed.success) {
    console.warn(
      '[billing.api.subscriptions.bill] validation failed',
      parsed.error.issues
    )
    return apiError('Invalid invoice generation request.', { status: 422 })
  }

  try {
    const result = await service.subscriptions.bill(
      access.context.tenant.id,
      subscriptionId,
      undefined,
      {
        advance: parsed.data.advance,
        forceAdvance: parsed.data.advance,
        invoiceModeOverride: parsed.data.draft ? 'DRAFT' : undefined,
      }
    )
    if (!result.invoiceId)
      return apiError(
        'An invoice cannot be generated for the current billing period.',
        { status: 409 }
      )

    return apiSuccess({ object: 'invoice', id: result.invoiceId })
  } catch (error) {
    console.error('[billing.api.subscriptions.bill]', error)
    return apiError('Failed to bill the subscription.', { status: 500 })
  }
}
