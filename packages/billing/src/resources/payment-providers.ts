import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  PaymentProviderConnectionCreatedSchema,
  PaymentProviderConnectionListSchema,
  PaymentProviderListSchema,
} from '../schemas'
import type {
  List,
  PaymentProvider,
  PaymentProviderConnection,
  PaymentProviderConnectionCreateParams,
  PaymentProviderConnectionUpdateParams,
  RequestOptions,
} from '../types'

export function createPaymentProvidersResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<PaymentProvider>>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/payment-providers',
          signal: options?.signal,
        },
        PaymentProviderListSchema
      )
    },
    connections: {
      list(options?: RequestOptions) {
        return Request<List<PaymentProviderConnection>>(
          runtime,
          {
            method: 'GET',
            path: '/api/v1/payment-providers/connections',
            signal: options?.signal,
          },
          PaymentProviderConnectionListSchema
        )
      },
      create(
        params: PaymentProviderConnectionCreateParams,
        options?: RequestOptions
      ) {
        return Request(
          runtime,
          {
            method: 'POST',
            path: '/api/v1/payment-providers/connections',
            body: params,
            signal: options?.signal,
          },
          PaymentProviderConnectionCreatedSchema
        )
      },
      update(
        connectionId: string,
        params: PaymentProviderConnectionUpdateParams,
        options?: RequestOptions
      ) {
        return Request(
          runtime,
          {
            method: 'PATCH',
            path: `/api/v1/payment-providers/connections/${encodeURIComponent(connectionId)}`,
            body: params,
            signal: options?.signal,
          },
          PaymentProviderConnectionCreatedSchema
        )
      },
    },
  }
}
