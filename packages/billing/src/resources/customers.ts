import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  CustomerAccountSchema,
  CustomerCreatedSchema,
  InvoiceCreatedSchema,
} from '../schemas'
import type {
  CustomerAccount,
  CustomerCreated,
  CustomerCreateParams,
  CustomerOpeningBalanceParams,
  InvoiceCreated,
  RequestOptions,
} from '../types'

/** `$billing.customers.*` — tenant-scoped customer operations. */
export function createCustomersResource(runtime: Runtime) {
  return {
    /** Creates a customer in the active Billing workspace. */
    create(params: CustomerCreateParams, options?: RequestOptions) {
      return Request<CustomerCreated>(
        runtime,
        {
          method: 'POST',
          path: '/api/v1/customers',
          body: params,
          signal: options?.signal,
        },
        CustomerCreatedSchema
      )
    },
    /** Retrieves customer balances and the latest statement entries. */
    account(customerId: string, options?: RequestOptions) {
      return Request<CustomerAccount>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/customers/${encodeURIComponent(customerId)}/account`,
          signal: options?.signal,
        },
        CustomerAccountSchema
      )
    },
    /** Records a receivable brought forward from another system. */
    recordOpeningBalance(
      customerId: string,
      params: CustomerOpeningBalanceParams,
      options?: RequestOptions
    ) {
      return Request<InvoiceCreated>(
        runtime,
        {
          method: 'POST',
          path: `/api/v1/customers/${encodeURIComponent(customerId)}/opening-balance`,
          body: params,
          signal: options?.signal,
        },
        InvoiceCreatedSchema
      )
    },
  }
}
