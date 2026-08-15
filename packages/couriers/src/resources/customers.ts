import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  customerListSchema,
  customerSchema,
  customerEnrollmentSchema,
  deletedCustomerSchema,
  type CreateCustomerBody,
  type Customer,
  type CustomerEnrollment,
  type CustomerEnrollmentBody,
  type CustomerList,
  type DeletedCustomer,
  type DeleteCustomerBody,
  type ListCustomersParams,
  type UpdateCustomerBody,
} from '../admin/types/customer.schema'

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

function toCreateCustomerBody(
  params: Extract<CreateCustomerParams, { mode?: 'new' } | { mode?: undefined }>
): CreateCustomerBody {
  const kind = params.customerKind ?? 'INDIVIDUAL'
  return {
    idempotencyKey: params.idempotencyKey,
    customerKind: kind,
    firstName: params.firstName,
    lastName: params.lastName ?? null,
    companyName: params.companyName,
    email: params.email ?? null,
    phone: params.phone ?? null,
    branchId: params.branchId ?? null,
    status: params.status,
    trn: params.trn ?? undefined,
    isCommercial: params.isCommercial,
  } as CreateCustomerBody
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
      if ((params as { mode?: string }).mode === 'existing') {
        const p = params as Extract<CreateCustomerParams, { mode: 'existing' }>
        const body: CustomerEnrollmentBody = {
          billingCustomerId: p.billingCustomerId,
          branchId: p.branchId ?? null,
          status: p.status,
          isCommercial: p.isCommercial,
          userId: p.userId ?? undefined,
        }
        return SessionRequest<CustomerEnrollment>(
          runtime,
          { method: 'POST', path: `${path}/enrollments`, body },
          customerEnrollmentSchema
        )
      }
      const body = toCreateCustomerBody(params as never)
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
