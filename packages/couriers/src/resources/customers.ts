import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  customerListSchema,
  customerSchema,
  deletedCustomerSchema,
  type CreateCustomerBody,
  type Customer,
  type CustomerEnrollmentBody,
  type CustomerList,
  type DeletedCustomer,
  type DeleteCustomerBody,
  type ListCustomersParams,
  type UpdateCustomerBody,
} from '../admin/types/customer.schema'
import { customerSchema as enrollmentCustomerSchema } from '../admin/types/customer.schema'

export type CreateCustomerParams =
  | ({
      mode?: 'new'
      customerKind?: 'INDIVIDUAL' | 'BUSINESS'
      firstName?: string
      lastName?: string
      companyName?: string
      email?: string
      phone?: string
      branchId?: string
      idempotencyKey: string
      status?: 'ACTIVE' | 'SUSPENDED'
      trn?: string | null
      isCommercial?: boolean
    } & Record<string, unknown>)
  | {
      mode: 'existing'
      billingCustomerId: string
      branchId?: string
      status?: 'ACTIVE' | 'SUSPENDED'
      isCommercial?: boolean
      userId?: string | null
    }

function toCreateCustomerBody(params: Extract<CreateCustomerParams, { mode?: 'new' } | { mode?: undefined }>): CreateCustomerBody {
  const kind = params.customerKind ?? 'INDIVIDUAL'
  return {
    idempotency_key: params.idempotencyKey,
    customer_kind: kind,
    first_name: params.firstName,
    last_name: params.lastName ?? null,
    company_name: params.companyName,
    email: params.email ?? null,
    phone: params.phone ?? null,
    branch_id: params.branchId ?? null,
    status: params.status,
    trn: params.trn ?? undefined,
    is_commercial: params.isCommercial,
  } as CreateCustomerBody
}

export function createCustomersResource(runtime: Runtime) {
  const path = '/v1/me/customers'
  return {
    list(params: ListCustomersParams = {}) {
      return SessionRequest<CustomerList>(runtime, { method: 'GET', path, query: params }, customerListSchema)
    },
    retrieve(id: string) {
      return SessionRequest<Customer>(runtime, { method: 'GET', path: `${path}/${encodeURIComponent(id)}` }, customerSchema)
    },
    create(params: CreateCustomerParams) {
      if ((params as { mode?: string }).mode === 'existing') {
        const p = params as Extract<CreateCustomerParams, { mode: 'existing' }>
        const body: CustomerEnrollmentBody = {
          billing_customer_id: p.billingCustomerId,
          branch_id: p.branchId ?? null,
          status: p.status,
          is_commercial: p.isCommercial,
          user_id: p.userId ?? undefined,
        }
        return SessionRequest<Customer>(runtime, { method: 'POST', path: `${path}/enrollments`, body }, customerSchema)
      }
      const body = toCreateCustomerBody(params as never)
      return SessionRequest<Customer>(runtime, { method: 'POST', path, body }, customerSchema)
    },
    update(id: string, body: UpdateCustomerBody) {
      return SessionRequest<Customer>(runtime, { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body }, customerSchema)
    },
    delete(id: string, body?: DeleteCustomerBody) {
      return SessionRequest<DeletedCustomer>(runtime, { method: 'DELETE', path: `${path}/${encodeURIComponent(id)}`, ...(body ? { body } : {}) }, deletedCustomerSchema)
    },
  }
}
