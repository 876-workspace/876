import { apiError, apiSuccess } from '@/lib/api/billing-route'
import {
  parseIntegrationCreateBody,
  requireCreateAttribution,
} from '@/lib/api/integration-idempotency'
import {
  integrationRoute,
  requireIntegrationOrganization,
} from '@/lib/api/integration-route'
import { BillingPaymentResource } from '@/lib/api/integration-resource'
import { service } from '@/lib/service'
import { PaymentCreateSchema } from '@/types/payment'

export const runtime = 'nodejs'

type Context = { params: Promise<{ organizationId: string }> }

/** Lists received payments in the organization's shared finance workspace. */
export const GET = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.payments.read'
  )
  if (access.response) return access.response

  const payments = await service.payments.list(access.tenant.id)
  return apiSuccess({
    object: 'list',
    data: payments.map(BillingPaymentResource),
    has_more: false,
    total_count: payments.length,
    url: `/api/v1/integrations/organizations/${organizationId}/payments`,
  })
})

/** Records a source-attributed payment with exactly-once create semantics. */
export const POST = integrationRoute<Context>(async (request, context) => {
  const { organizationId } = await context.params
  const access = await requireIntegrationOrganization(
    request,
    organizationId,
    'billing.payments.write'
  )
  if (access.response) return access.response

  const body = await request.json().catch(() => null)
  const parsed = parseIntegrationCreateBody(body, PaymentCreateSchema)
  if (parsed.response) return parsed.response
  const attribution = requireCreateAttribution(
    request,
    access,
    parsed.data.params,
    parsed.data.sourceExternalReference
  )
  if (attribution.response) return attribution.response

  const result = await service.payments.create(
    access.tenant.id,
    parsed.data.params,
    attribution.data ?? undefined
  )
  if (result.error !== null)
    return apiError(result.error, { status: result.status ?? 500 })

  const payment = await service.payments.retrieve(
    access.tenant.id,
    result.data.id
  )
  if (!payment)
    return apiError('Payment was created but could not be retrieved.', {
      status: 500,
    })

  return apiSuccess(BillingPaymentResource(payment), {
    status: result.data.replayed ? 200 : 201,
  })
})
