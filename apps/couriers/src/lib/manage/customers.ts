import 'server-only'

import { get876Client } from '@/lib/876'
import { $couriers, couriersErrorStatus, toCustomerView } from '@/lib/couriers'
import {
  createExternalCustomer,
  updateExternalCustomer,
} from '@/lib/finance/customers'
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
  const $876 = await get876Client()
  const registry = await createExternalCustomer($876.billing, tenant.orgId, {
    // The key comes from the client and is held across retries of the same
    // submission. Deriving it from the profile id instead would defeat the
    // point: a retry generates a fresh profile id, so Billing would mint a
    // second customer for the same person on every transient failure.
    idempotencyKey: params.idempotencyKey,
    customerKind: params.customerKind ?? 'INDIVIDUAL',
    firstName: params.firstName ?? null,
    lastName: params.lastName ?? null,
    companyName: params.companyName ?? null,
    email: params.email ?? null,
    phone: params.phone ?? null,
  })
  if (registry.error || !registry.data)
    return localFailure('customer/registry-unavailable')

  // Billing reuses the submission idempotency key on a retry. The Couriers
  // enrollment endpoint then creates the profile and primary mailbox in one
  // transaction, so no app-local allocation race remains.
  const enrollment = await $couriers.customers.enroll(tenant.id, {
    billing_customer_id: registry.data.id,
    branch_id: params.branchId,
    status: params.status,
    is_commercial: params.isCommercial,
  })
  if (enrollment.error !== null) return couriersFailure(enrollment.error)
  return { data: toCustomerView(enrollment.data.customer), error: null }
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
  const profileResult = await $couriers.customers.retrieve(tenant.id, id)
  if (profileResult.error !== null) return couriersFailure(profileResult.error)
  const profile = profileResult.data

  const updateProfile = async () => {
    const result = await $couriers.customers.update(tenant.id, id, {
      ...(params.branchId === undefined ? {} : { branch_id: params.branchId }),
      ...(params.status === undefined ? {} : { status: params.status }),
      ...(params.trn === undefined ? {} : { trn: params.trn }),
      ...(params.isCommercial === undefined
        ? {}
        : { is_commercial: params.isCommercial }),
    })
    if (result.error !== null) return couriersFailure(result.error)
    return { data: toCustomerView(result.data), error: null }
  }

  const identityKeys = [
    'firstName',
    'lastName',
    'companyName',
    'email',
    'phone',
  ] as const
  const touchesIdentity = identityKeys.some((key) => params[key] !== undefined)
  if (touchesIdentity) {
    const $876 = await get876Client()
    const current = await $876.billing.customers.retrieve(
      tenant.orgId,
      profile.billing_customer_id
    )
    if (current.error || !current.data)
      return localFailure('customer/registry-unavailable')

    // Compare against what the registry already holds rather than trusting the
    // mere presence of a key. A client that echoes the whole record back — which
    // an edit form naturally does — would otherwise be unable to change a
    // courier-owned field on a portal customer at all.
    const registryCustomer = current.data
    const changesIdentity = identityKeys.some(
      (key) =>
        params[key] !== undefined && params[key] !== registryCustomer[key]
    )
    if (changesIdentity && registryCustomer.customerType !== 'EXTERNAL')
      return localFailure('customer/identity-locked')

    // Nothing to send when the identity is byte-for-byte what the registry holds.
    if (!changesIdentity) return updateProfile()

    const registry = await updateExternalCustomer(
      $876.billing,
      tenant.orgId,
      profile.billing_customer_id,
      {
        customerKind: current.data.customerKind,
        firstName: params.firstName ?? current.data.firstName,
        lastName:
          params.lastName === undefined
            ? current.data.lastName
            : params.lastName,
        companyName: params.companyName ?? current.data.companyName,
        email: params.email === undefined ? current.data.email : params.email,
        phone: params.phone === undefined ? current.data.phone : params.phone,
      }
    )
    if (registry.error || !registry.data)
      return localFailure('customer/registry-unavailable')
  }

  return updateProfile()
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
