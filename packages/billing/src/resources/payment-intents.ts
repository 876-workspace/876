import { Request } from '../request'
import type { Runtime } from '../runtime'
import { PaymentIntentListSchema, PaymentIntentSchema } from '../schemas'
import type {
  PaymentIntent,
  PaymentIntentCancelParams,
  PaymentIntentCreateParams,
  PaymentIntentList,
  PaymentIntentListParams,
  RequestOptions,
} from '../types'

function collectionPath(runtime: Runtime): string {
  return `/api/v1/organizations/${encodeURIComponent(runtime.organizationId ?? '')}/payment-intents`
}

/** `$876.paymentIntents.*` — stateful payment collection attempts. */
export function createPaymentIntentsResource(runtime: Runtime) {
  return {
    list(params: PaymentIntentListParams = {}, options?: RequestOptions) {
      return Request<PaymentIntentList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(runtime),
          query: {
            customerId: params.customerId,
            status: params.status,
            limit: params.limit,
          },
          signal: options?.signal,
        },
        PaymentIntentListSchema
      )
    },
    create(params: PaymentIntentCreateParams, options?: RequestOptions) {
      return Request<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(runtime),
          body: params,
          signal: options?.signal,
        },
        PaymentIntentSchema
      )
    },
    retrieve(paymentIntentId: string, options?: RequestOptions) {
      return Request<PaymentIntent>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentIntentId)}`,
          signal: options?.signal,
        },
        PaymentIntentSchema
      )
    },
    confirm(paymentIntentId: string, options?: RequestOptions) {
      return Request<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentIntentId)}/confirm`,
          signal: options?.signal,
        },
        PaymentIntentSchema
      )
    },
    capture(paymentIntentId: string, options?: RequestOptions) {
      return Request<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentIntentId)}/capture`,
          signal: options?.signal,
        },
        PaymentIntentSchema
      )
    },
    cancel(
      paymentIntentId: string,
      params: PaymentIntentCancelParams = {},
      options?: RequestOptions
    ) {
      return Request<PaymentIntent>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentIntentId)}/cancel`,
          body: params,
          signal: options?.signal,
        },
        PaymentIntentSchema
      )
    },
  }
}
