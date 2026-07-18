import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingSubscriptionResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import type { SubscriptionStatus } from '@/types/subscription'
import { SubscriptionStatusSchema } from '@/types/subscription'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Lists Billing subscriptions belonging to a core organization's workspace. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.subscriptions.read'
  )
  if (access.response) return access.response

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  const customerId = url.searchParams.get('customer_id') ?? undefined

  let status: SubscriptionStatus | undefined = undefined
  if (statusParam) {
    const parsed = SubscriptionStatusSchema.safeParse(statusParam)
    if (!parsed.success) {
      return apiError('Enter a valid subscription status filter.', {
        status: 400,
      })
    }
    status = parsed.data
  }

  const subscriptions = await service.subscriptions.listSubscriptions(
    access.tenant.id,
    { status, customerId }
  )

  return apiSuccess({
    object: 'list',
    data: subscriptions.map(BillingSubscriptionResource),
    has_more: false,
    total_count: subscriptions.length,
    url: `/api/v1/integrations/organizations/${organizationId}/subscriptions`,
  })
})
