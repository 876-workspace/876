import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  PaymentModeCreatedSchema,
  PaymentModeDeletedSchema,
  PaymentModeListSchema,
  PaymentModeSchema,
} from '../schemas'
import type {
  List,
  PaymentMode,
  PaymentModeCreated,
  PaymentModeCreateParams,
  PaymentModeDeleted,
  PaymentModeUpdateParams,
  RequestOptions,
} from '../types'

/** `$billing.paymentModes.*` - tenant-configured ways to receive money. */
export function createPaymentModesResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<PaymentMode>>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/payments/modes',
          signal: options?.signal,
        },
        PaymentModeListSchema
      )
    },
    create(params: PaymentModeCreateParams, options?: RequestOptions) {
      return Request<PaymentModeCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/payments/modes',
          body: params,
          signal: options?.signal,
        },
        PaymentModeCreatedSchema
      )
    },
    retrieve(modeId: string, options?: RequestOptions) {
      return Request<PaymentMode>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/payments/modes/${encodeURIComponent(modeId)}`,
          signal: options?.signal,
        },
        PaymentModeSchema
      )
    },
    update(
      modeId: string,
      params: PaymentModeUpdateParams,
      options?: RequestOptions
    ) {
      return Request<PaymentModeCreated>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/payments/modes/${encodeURIComponent(modeId)}`,
          body: params,
          signal: options?.signal,
        },
        PaymentModeCreatedSchema
      )
    },
    delete(modeId: string, options?: RequestOptions) {
      return Request<PaymentModeDeleted>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/payments/modes/${encodeURIComponent(modeId)}`,
          signal: options?.signal,
        },
        PaymentModeDeletedSchema
      )
    },
  }
}
