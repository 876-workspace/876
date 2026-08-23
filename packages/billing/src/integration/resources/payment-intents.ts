import { PaymentIntentListSchema, PaymentIntentSchema } from '../../schemas'
import type {
  PaymentIntent,
  PaymentIntentCancelParams,
  PaymentIntentCreateParams,
  PaymentIntentList,
  PaymentIntentListParams,
} from '../../types'
import { IntegrationRequest } from '../request'
import type { IntegrationRuntime } from '../runtime'

function collectionPath(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/payment-intents`
}

/** Server-only organization-scoped payment-intent integration. */
export function createIntegrationPaymentIntentsResource(
  runtime: IntegrationRuntime
) {
  return {
    list(organizationId: string, params: PaymentIntentListParams = {}) {
      return IntegrationRequest<PaymentIntentList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(organizationId),
          query: {
            customerId: params.customerId,
            status: params.status,
            limit: params.limit,
          },
        },
        PaymentIntentListSchema
      )
    },
    create(organizationId: string, params: PaymentIntentCreateParams) {
      return IntegrationRequest<PaymentIntent>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        PaymentIntentSchema
      )
    },
    retrieve(organizationId: string, paymentIntentId: string) {
      return IntegrationRequest<PaymentIntent>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentIntentId)}`,
        },
        PaymentIntentSchema
      )
    },
    confirm(organizationId: string, paymentIntentId: string) {
      return IntegrationRequest<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentIntentId)}/confirm`,
        },
        PaymentIntentSchema
      )
    },
    capture(organizationId: string, paymentIntentId: string) {
      return IntegrationRequest<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentIntentId)}/capture`,
        },
        PaymentIntentSchema
      )
    },
    cancel(
      organizationId: string,
      paymentIntentId: string,
      params: PaymentIntentCancelParams = {}
    ) {
      return IntegrationRequest<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentIntentId)}/cancel`,
          body: params,
        },
        PaymentIntentSchema
      )
    },
  }
}
