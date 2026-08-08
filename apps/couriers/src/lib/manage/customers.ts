import 'server-only'

import type { Tenant } from '@/lib/db'
import { get876Client } from '@/lib/876'
import {
  createExternalCustomer,
  updateExternalCustomer,
} from '@/lib/finance/customers'
import { generateId } from '@/lib/id'
import { service } from '@/lib/service'
import { errFrom } from '@/lib/service/result'
import type { ServiceResult } from '@/types/api'
import type {
  CustomerCreateParams,
  CustomerUpdateParams,
  CustomerView,
} from '@/types/customer'

export async function createManagedCustomer({
  tenant,
  params,
}: {
  tenant: Tenant
  params: CustomerCreateParams
}): ServiceResult<CustomerView> {
  const profileId = generateId('CourierCustomerProfile')
  const allocation = await service.mailboxes.allocate({ tenantId: tenant.id })
  if (allocation.data === null) return errFrom('customer/mailbox-unavailable')

  const $876 = await get876Client()
  const registry = await createExternalCustomer($876.billing, tenant.orgId, {
    profileId,
    customerKind: params.customerKind ?? 'INDIVIDUAL',
    firstName: params.firstName ?? null,
    lastName: params.lastName ?? null,
    companyName: params.companyName ?? null,
    email: params.email ?? null,
    phone: params.phone ?? null,
  })
  if (registry.error || !registry.data)
    return errFrom('customer/registry-unavailable')

  // A registry row left behind by a failed profile write is intentional: retrying
  // with this pre-generated profile id reuses the same idempotency anchor.
  return service.customerProfiles.create(tenant.id, {
    id: profileId,
    billingCustomerId: registry.data.id,
    userId: null,
    mailboxNumber: allocation.data.number,
    branchId: params.branchId,
    trn: params.trn,
    isCommercial: params.isCommercial,
    status: params.status,
  })
}

export async function updateManagedCustomer({
  tenant,
  id,
  params,
}: {
  tenant: Tenant
  id: string
  params: CustomerUpdateParams
}): ServiceResult<CustomerView> {
  const profile = await service.customerProfiles.retrieve(tenant.id, id)
  if (!profile) return errFrom('customer/not-found')

  const updateProfile = () =>
    service.customerProfiles.update(tenant.id, id, {
      branchId: params.branchId,
      status: params.status,
      trn: params.trn,
      isCommercial: params.isCommercial,
    })

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
      profile.billingCustomerId
    )
    if (current.error || !current.data)
      return errFrom('customer/registry-unavailable')

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
      return errFrom('customer/identity-locked')

    // Nothing to send when the identity is byte-for-byte what the registry holds.
    if (!changesIdentity) return updateProfile()

    const registry = await updateExternalCustomer(
      $876.billing,
      tenant.orgId,
      profile.billingCustomerId,
      {
        customerKind: current.data.customerKind,
        firstName: params.firstName ?? current.data.firstName,
        lastName: params.lastName ?? current.data.lastName,
        companyName: params.companyName ?? current.data.companyName,
        email: params.email ?? current.data.email,
        phone: params.phone ?? current.data.phone,
      }
    )
    if (registry.error || !registry.data)
      return errFrom('customer/registry-unavailable')
  }

  return updateProfile()
}
