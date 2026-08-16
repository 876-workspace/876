import { Request } from '../request'
import type { Runtime } from '../runtime'
import {
  CustomerAccountSchema,
  CustomerCreatedSchema,
  CustomerListSchema,
  CustomerSchema,
  DeletedCustomerSchema,
  InvoiceCreatedSchema,
} from '../schemas'
import type {
  Customer,
  CustomerAccount,
  CustomerCreated,
  CustomerCreateParams,
  CustomerList,
  CustomerListParams,
  CustomerOpeningBalanceParams,
  CustomerUpdateParams,
  DeletedCustomer,
  InvoiceCreated,
  RequestOptions,
} from '../types'

/** `$876.billing.customers.*` — tenant-scoped customer operations. */
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
    /** Lists customers in the active Billing workspace. */
    list(params: CustomerListParams = {}, options?: RequestOptions) {
      return Request<CustomerList>(
        runtime,
        {
          method: 'GET',
          path: '/api/v1/customers',
          query: {
            status: params.status,
            ids: params.ids?.join(','),
            userId: params.userId,
            organizationId: params.organizationId,
            starting_after: params.starting_after,
            ending_before: params.ending_before,
            limit: params.limit,
          },
          signal: options?.signal,
        },
        CustomerListSchema
      )
    },
    /** Retrieves a single customer by ID. */
    retrieve(customerId: string, options?: RequestOptions) {
      return Request<Customer>(
        runtime,
        {
          method: 'GET',
          path: `/api/v1/customers/${encodeURIComponent(customerId)}`,
          signal: options?.signal,
        },
        CustomerSchema
      )
    },
    /** Updates an existing customer. */
    update(
      customerId: string,
      params: CustomerUpdateParams,
      options?: RequestOptions
    ) {
      return Request<Customer>(
        runtime,
        {
          method: 'PATCH',
          path: `/api/v1/customers/${encodeURIComponent(customerId)}`,
          body: params,
          signal: options?.signal,
        },
        CustomerSchema
      )
    },
    /** Deletes a customer by ID. */
    delete(customerId: string, options?: RequestOptions) {
      return Request<DeletedCustomer>(
        runtime,
        {
          method: 'DELETE',
          path: `/api/v1/customers/${encodeURIComponent(customerId)}`,
          signal: options?.signal,
        },
        DeletedCustomerSchema
      )
    },
  }
}
