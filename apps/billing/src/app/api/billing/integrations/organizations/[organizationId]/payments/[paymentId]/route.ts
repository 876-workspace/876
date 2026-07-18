import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingPaymentResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ organizationId: string; paymentId: string }>
}

export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId, paymentId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.payments.read'
  )
  if (access.response) return access.response

  const payment = await service.payments.retrieve(access.tenant.id, paymentId)
  if (!payment) return apiError('Payment not found.', { status: 404 })
  return apiSuccess(BillingPaymentResource(payment))
})
