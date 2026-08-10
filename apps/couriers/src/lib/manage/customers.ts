import 'server-only'

import { $876 } from '@/lib/876'
import { couriersErrorStatus, toCustomerView } from '@/lib/couriers'
import { getError, type CouriersErrorCode } from '@/lib/errors'
import type { ServiceResult } from '@/types/api'
import type { CouriersTenant } from '@/types/auth'
import type {
  CustomerCreateParams,
  CustomerUpdateParams,
  CustomerView,
} from '@/types/customer'

export async function createManagedCustomer({
  tenant,
  params,
}: {
  tenant: CouriersTenant
  params: CustomerCreateParams
}): ServiceResult<CustomerView> {
  const result = await $876.couriers.customers.create(tenant.id, {
    idempotency_key: params.idempotencyKey,
    customer_kind: params.customerKind ?? 'INDIVIDUAL',
    ...(params.firstName === undefined ? {} : { first_name: params.firstName }),
    ...(params.lastName === undefined ? {} : { last_name: params.lastName }),
    ...(params.companyName === undefined
      ? {}
      : { company_name: params.companyName }),
    email: params.email ?? null,
    phone: params.phone ?? null,
    ...(params.branchId === undefined ? {} : { branch_id: params.branchId }),
    status: params.status,
    is_commercial: params.isCommercial,
    trn: params.trn ?? null,
  })
  if (result.error !== null) return couriersFailure(result.error)
  return { data: toCustomerView(result.data), error: null }
}

export async function updateManagedCustomer({
  tenant,
  id,
  params,
}: {
  tenant: CouriersTenant
  id: string
  params: CustomerUpdateParams
}): ServiceResult<CustomerView> {
  const result = await $876.couriers.customers.update(tenant.id, id, {
    ...(params.firstName === undefined ? {} : { first_name: params.firstName }),
    ...(params.lastName === undefined ? {} : { last_name: params.lastName }),
    ...(params.companyName === undefined
      ? {}
      : { company_name: params.companyName }),
    ...(params.email === undefined ? {} : { email: params.email }),
    ...(params.phone === undefined ? {} : { phone: params.phone }),
    ...(params.branchId === undefined ? {} : { branch_id: params.branchId }),
    ...(params.status === undefined ? {} : { status: params.status }),
    ...(params.trn === undefined ? {} : { trn: params.trn }),
    ...(params.isCommercial === undefined
      ? {}
      : { is_commercial: params.isCommercial }),
  })
  if (result.error !== null) {
    if (result.error.code === 'customer/identity-locked')
      return localFailure('customer/identity-locked')
    if (result.error.code === 'customer/registry-unavailable')
      return localFailure('customer/registry-unavailable')
    return couriersFailure(result.error)
  }
  return { data: toCustomerView(result.data), error: null }
}

function couriersFailure(error: { code: string; message: string }) {
  return {
    data: null,
    error: error.message,
    status: couriersErrorStatus(error),
    code: error.code,
  }
}

function localFailure(code: CouriersErrorCode) {
  const error = getError(code)
  return {
    data: null,
    error: error.message,
    status: error.httpStatus,
    code: error.code,
  }
}
