import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  PaymentTermCreatedSchema,
  PaymentTermListSchema,
  SalespersonCreatedSchema,
  SalespersonListSchema,
} from '../schemas'
import type {
  List,
  PaymentTerm,
  PaymentTermCreateParams,
  RequestOptions,
  Salesperson,
  SalespersonCreateParams,
} from '../types'

export function createPaymentTermsResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<PaymentTerm>>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/payment-terms',
          signal: options?.signal,
        },
        PaymentTermListSchema
      )
    },
    create(params: PaymentTermCreateParams, options?: RequestOptions) {
      return Request(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/payment-terms',
          body: params,
          signal: options?.signal,
        },
        PaymentTermCreatedSchema
      )
    },
  }
}

export function createSalespeopleResource(runtime: Runtime) {
  return {
    list(options?: RequestOptions) {
      return Request<List<Salesperson>>(
        runtime,
        { method: 'GET', path: '/api/v1/salespeople', signal: options?.signal },
        SalespersonListSchema
      )
    },
    create(params: SalespersonCreateParams, options?: RequestOptions) {
      return Request(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/salespeople',
          body: params,
          signal: options?.signal,
        },
        SalespersonCreatedSchema
      )
    },
  }
}
