import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  customerListSchema,
  customerSchema,
  deletedCustomerSchema,
  type CreateCustomerBody,
  type Customer,
  type CustomerList,
  type DeletedCustomer,
  type DeleteCustomerBody,
  type ListCustomersParams,
  type UpdateCustomerBody,
} from '../admin/types/customer.schema'

export type CreateCustomerParams =
  | {
      source: 'party'
      idempotencyKey: string
      party: {
        customerKind?: 'INDIVIDUAL' | 'BUSINESS'
        firstName?: string
        lastName?: string | null
        companyName?: string
        email?: string | null
        phone?: string | null
      }
      branchId: string
      status?: 'ACTIVE' | 'SUSPENDED'
      trn?: string | null
      isCommercial?: boolean
    }
  | {
      source: 'registry'
      billingCustomerId: string
      branchId: string
      status?: 'ACTIVE' | 'SUSPENDED'
      trn?: string | null
      isCommercial?: boolean
    }

function toCreateCustomerBody(
  params: CreateCustomerParams
): CreateCustomerBody {
  if (params.source === 'registry')
    return {
      source: 'registry',
      billing_customer_id: params.billingCustomerId,
      branch_id: params.branchId,
      status: params.status,
      trn: params.trn,
      is_commercial: params.isCommercial,
    }

  return {
    source: 'party',
    idempotency_key: params.idempotencyKey,
    party: {
      customer_kind: params.party.customerKind,
      first_name: params.party.firstName,
      last_name: params.party.lastName,
      company_name: params.party.companyName,
      email: params.party.email,
      phone: params.party.phone,
    },
    branch_id: params.branchId,
    status: params.status,
    trn: params.trn,
    is_commercial: params.isCommercial,
  }
}

export function createCustomersResource(runtime: Runtime) {
  const path = '/v1/me/customers'
  return {
    list(params: ListCustomersParams = {}) {
      return SessionRequest<CustomerList>(
        runtime,
        { method: 'GET', path, query: params },
        customerListSchema
      )
    },
    retrieve(id: string) {
      return SessionRequest<Customer>(
        runtime,
        { method: 'GET', path: `${path}/${encodeURIComponent(id)}` },
        customerSchema
      )
    },
    create(params: CreateCustomerParams) {
      const body = toCreateCustomerBody(params)
      return SessionRequest<Customer>(
        runtime,
        { method: 'POST', path, body },
        customerSchema
      )
    },
    update(id: string, body: UpdateCustomerBody) {
      return SessionRequest<Customer>(
        runtime,
        { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body },
        customerSchema
      )
    },
    delete(id: string, body?: DeleteCustomerBody) {
      return SessionRequest<DeletedCustomer>(
        runtime,
        {
          method: 'DELETE',
          path: `${path}/${encodeURIComponent(id)}`,
          ...(body ? { body } : {}),
        },
        deletedCustomerSchema
      )
    },
  }
}
