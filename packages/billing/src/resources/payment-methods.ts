import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  DeletedPaymentMethodSchema,
  PaymentMethodListSchema,
  PaymentMethodSchema,
} from '../schemas'
import type {
  DeletedPaymentMethod,
  PaymentMethod,
  PaymentMethodCreateParams,
  PaymentMethodList,
  PaymentMethodListParams,
  PaymentMethodUpdateParams,
  RequestOptions,
} from '../types'

function collectionPath(runtime: Runtime): string {
  return `/api/v1/organizations/${encodeURIComponent(runtime.organizationId ?? '')}/payment-methods`
}

function listQuery(params: PaymentMethodListParams = {}) {
  return {
    customerId: params.customerId,
    type: params.type,
    status: params.status,
    limit: params.limit,
    starting_after: params.startingAfter,
  }
}

/** `$876.paymentMethods.*` — non-secret payment instrument metadata. */
export function createPaymentMethodsResource(runtime: Runtime) {
  return {
    list(params: PaymentMethodListParams = {}, options?: RequestOptions) {
      return Request<PaymentMethodList>(
        runtime,
        {
          method: 'GET',
          path: collectionPath(runtime),
          query: listQuery(params),
          signal: options?.signal,
        },
        PaymentMethodListSchema
      )
    },
    create(params: PaymentMethodCreateParams, options?: RequestOptions) {
      return Request<PaymentMethod>(
        runtime,
        {
          method: 'POST',
          path: collectionPath(runtime),
          body: params,
          signal: options?.signal,
        },
        PaymentMethodSchema
      )
    },
    retrieve(paymentMethodId: string, options?: RequestOptions) {
      return Request<PaymentMethod>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentMethodId)}`,
          signal: options?.signal,
        },
        PaymentMethodSchema
      )
    },
    update(
      paymentMethodId: string,
      params: PaymentMethodUpdateParams,
      options?: RequestOptions
    ) {
      return Request<PaymentMethod>(
        runtime,
        {
          method: 'PATCH',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentMethodId)}`,
          body: params,
          signal: options?.signal,
        },
        PaymentMethodSchema
      )
    },
    delete(paymentMethodId: string, options?: RequestOptions) {
      return Request<DeletedPaymentMethod>(
        runtime,
        {
          method: 'DELETE',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentMethodId)}`,
          signal: options?.signal,
        },
        DeletedPaymentMethodSchema
      )
    },
    setDefault(paymentMethodId: string, options?: RequestOptions) {
      return Request<PaymentMethod>(
        runtime,
        {
          method: 'POST',
          path: `${collectionPath(runtime)}/${encodeURIComponent(paymentMethodId)}/default`,
          signal: options?.signal,
        },
        PaymentMethodSchema
      )
    },
    listForCustomer(
      customerId: string,
      params: Omit<PaymentMethodListParams, 'customerId'> = {},
      options?: RequestOptions
    ) {
      return Request<PaymentMethodList>(
        runtime,
        {
          method: 'GET',
          path: `${collectionPath(runtime).replace('/payment-methods', '')}/customers/${encodeURIComponent(customerId)}/payment-methods`,
          query: listQuery(params),
          signal: options?.signal,
        },
        PaymentMethodListSchema
      )
    },
  }
}
