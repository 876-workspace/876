import { apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingPaymentModeResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Lists the shared payment methods a connected app may use for payments. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.payments.read'
  )
  if (access.response) return access.response

  const modes = (await service.paymentModes.list(access.tenant.id)).filter(
    (mode) => mode.isActive
  )
  return apiSuccess({
    object: 'list',
    data: modes.map(BillingPaymentModeResource),
    has_more: false,
    total_count: modes.length,
    url: `/api/v1/integrations/organizations/${organizationId}/payment-modes`,
  })
})
