import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  PaymentCreatedSchema,
  PaymentDeletedSchema,
  PaymentListSchema,
  PaymentSchema,
} from '../schemas'
import type {
  List,
  Payment,
  PaymentApplyParams,
  PaymentCreated,
  PaymentCreateParams,
  PaymentDeleted,
  PaymentUpdateParams,
  RequestOptions,
} from '../types'

/** `$billing.payments.*` - received money and invoice allocations. */
export function createPaymentsResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<Payment>>(
        runtime,
        { method: 'GET', path: '/api/v1/payments', signal: options?.signal },
        PaymentListSchema
      )
    },
    create(params: PaymentCreateParams, options?: RequestOptions) {
      return Request<PaymentCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/payments',
          body: params,
          signal: options?.signal,
        },
        PaymentCreatedSchema
      )
    },
    retrieve(paymentId: string, options?: RequestOptions) {
      return Request<Payment>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/payments/${encodeURIComponent(paymentId)}`,
          signal: options?.signal,
        },
        PaymentSchema
      )
    },
    update(
      paymentId: string,
      params: PaymentUpdateParams,
      options?: RequestOptions
    ) {
      return Request<PaymentCreated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/payments/${encodeURIComponent(paymentId)}`,
          body: params,
          signal: options?.signal,
        },
        PaymentCreatedSchema
      )
    },
    apply(
      paymentId: string,
      params: PaymentApplyParams,
      options?: RequestOptions
    ) {
      return Request<PaymentCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/payments/${encodeURIComponent(paymentId)}/apply`,
          body: params,
          signal: options?.signal,
        },
        PaymentCreatedSchema
      )
    },
    delete(paymentId: string, options?: RequestOptions) {
      return Request<PaymentDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/payments/${encodeURIComponent(paymentId)}`,
          signal: options?.signal,
        },
        PaymentDeletedSchema
      )
    },
  }
}
