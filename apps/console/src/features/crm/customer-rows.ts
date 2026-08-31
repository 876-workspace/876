import type { CrmCustomerRow } from '@876/crm-ui/customer-list'

import { resolveCustomerIdentity } from './customer-identity'

/** The shape `crm.customers.list()` returns one of. */
type CustomerProfileEntry = {
  profile: {
    id: string
    billingCustomerId: string
    status: 'ACTIVE' | 'INACTIVE'
  }
  customer: Parameters<typeof resolveCustomerIdentity>[0]
}

/**
 * Flattens a CRM customer profile plus its registry party into a table row.
 *
 * Shared by the customers list and the workspace overview so the two cannot
 * disagree about which name, email, or contact belongs to a customer.
 */
export function toCustomerRow(entry: CustomerProfileEntry): CrmCustomerRow {
  const identity = resolveCustomerIdentity(
    entry.customer,
    entry.profile.billingCustomerId
  )

  return {
    profileId: entry.profile.id,
    name: identity.name,
    isBusiness: identity.isBusiness,
    email: identity.email,
    phone: identity.phone,
    contactName: identity.contact?.name ?? null,
    contactEmail: identity.contact?.email ?? null,
    typeLabel: identity.typeLabel,
    status: entry.profile.status,
  }
}
