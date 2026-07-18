import { BillingPaymentListSchema, BillingPaymentSchema } from '../schemas'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'
import type {
  BillingPayment,
  BillingPaymentCreateParams,
  BillingPaymentList,
  IntegrationCreateOptions,
} from '../types'

function collectionPath(organizationId: string): string {
  return `/api/v1/integrations/organizations/${encodeURIComponent(organizationId)}/payments`
}

/** `$billing.payments.*` — shared finance payment integrations. */
export function createIntegrationPaymentsResource(runtime: IntegrationRuntime) {
  return {
    list(organizationId: string) {
      return IntegrationRequest<BillingPaymentList>(
        runtime,
        { method: 'GET', path: collectionPath(organizationId) },
        BillingPaymentListSchema
      )
    },

    retrieve(organizationId: string, paymentId: string) {
      return IntegrationRequest<BillingPayment>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentId)}`,
        },
        BillingPaymentSchema
      )
    },

    create(
      organizationId: string,
      params: BillingPaymentCreateParams,
      options: IntegrationCreateOptions
    ) {
      return IntegrationRequest<BillingPayment>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(organizationId),
          body: params,
          headers: { 'Idempotency-Key': options.idempotencyKey },
        },
        BillingPaymentSchema
      )
    },
  }
}
