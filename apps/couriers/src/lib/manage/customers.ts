import 'server-only'

import { $876 } from '@/lib/876'
import { couriersErrorStatus, toCustomerView } from '@/lib/couriers'
import { getError, type CouriersErrorCode } from '@/lib/errors'
import type { ServiceResult } from '@/types/api'
import type { CouriersTenant } from '@/types/auth'
import type {
  CustomerCreateParams,
  CustomerEnrollmentParams,
  CustomerUpdateParams,
  CustomerView,
} from '@/types/customer'

export async function enrollManagedCustomer({
  tenant,
  params,
}: {
  tenant: CouriersTenant
  params: CustomerEnrollmentParams
}): ServiceResult<CustomerView> {
  const { get876Client } = await import('@/lib/876')
  const client = await get876Client()
  const result = await client.customers.create({
    mode: 'existing',
    billingCustomerId: params.billingCustomerId,
    branchId: params.branchId,
    status: params.status,
    isCommercial: params.isCommercial,
  })
  if (result.error !== null) return couriersFailure(result.error)

  return { data: toCustomerView(result.data.customer), error: null }
}

export async function createManagedCustomer({
  tenant,
  params,
}: {
  tenant: CouriersTenant
  params: CustomerCreateParams
}): ServiceResult<CustomerView> {
  const { get876Client } = await import('@/lib/876')
  const client = await get876Client()
  const result = await client.customers.create({
    mode: 'new',
    idempotencyKey: params.idempotencyKey,
    customerKind: params.customerKind ?? 'INDIVIDUAL',
    firstName: params.firstName,
    lastName: params.lastName,
    companyName: params.companyName,
    email: params.email ?? undefined,
    phone: params.phone ?? undefined,
    branchId: params.branchId,
    status: params.status,
    isCommercial: params.isCommercial,
    trn: params.trn ?? undefined,
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
  const { get876Client } = await import('@/lib/876')
  const client = await get876Client()
  const result = await client.customers.update(id, {
    ...(params.firstName === undefined ? {} : { firstName: params.firstName }),
    ...(params.lastName === undefined ? {} : { lastName: params.lastName }),
    ...(params.companyName === undefined
      ? {}
      : { companyName: params.companyName }),
    ...(params.email === undefined ? {} : { email: params.email }),
    ...(params.phone === undefined ? {} : { phone: params.phone }),
    ...(params.branchId === undefined ? {} : { branchId: params.branchId }),
    ...(params.status === undefined ? {} : { status: params.status }),
    ...(params.trn === undefined ? {} : { trn: params.trn }),
    ...(params.isCommercial === undefined
      ? {}
      : { isCommercial: params.isCommercial }),
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
