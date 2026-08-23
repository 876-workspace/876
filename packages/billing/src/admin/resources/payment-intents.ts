import { PaymentIntentListSchema, PaymentIntentSchema } from '../../schemas'
import type {
  PaymentIntent,
  PaymentIntentCancelParams,
  PaymentIntentCreateParams,
  PaymentIntentList,
  PaymentIntentListParams,
} from '../../types'
import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'

function collectionPath(organizationId: string) {
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/payment-intents`
}

/** Secret-service payment-intent operations, scoped explicitly to an organization. */
export function createAdminPaymentIntentsResource(runtime: AdminRuntime) {
  return {
    list(organizationId: string, params: PaymentIntentListParams = {}) {
      return AdminRequest<PaymentIntentList>(
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
      return AdminRequest<PaymentIntent>(
        runtime,
        { method: 'POST', path: collectionPath(organizationId), body: params },
        PaymentIntentSchema
      )
    },
    retrieve(organizationId: string, paymentIntentId: string) {
      return AdminRequest<PaymentIntent>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentIntentId)}`,
        },
        PaymentIntentSchema
      )
    },
    confirm(organizationId: string, paymentIntentId: string) {
      return AdminRequest<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(organizationId)}/${encodeURIComponent(paymentIntentId)}/confirm`,
        },
        PaymentIntentSchema
      )
    },
    capture(organizationId: string, paymentIntentId: string) {
      return AdminRequest<PaymentIntent>(
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
      return AdminRequest<PaymentIntent>(
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
