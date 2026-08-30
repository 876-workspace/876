import type { CrmCustomer } from '@876/crm'

import { resolveCustomerIdentity } from './customer-identity'

export type RequestCustomerOption = {
  id: string
  name: string
  legalName: string | null
  isBusiness: boolean
  email: string | null
  phone: string | null
  contactName: string | null
  typeLabel: string
  status: 'ACTIVE' | 'INACTIVE'
}

/** Turns a CRM customer profile into the compact identity used while creating a request. */
export function toRequestCustomerOption(
  entry: CrmCustomer
): RequestCustomerOption {
  const identity = resolveCustomerIdentity(
    entry.customer,
    entry.profile.billingCustomerId
  )

  return {
    id: entry.profile.id,
    name: identity.name,
    legalName: identity.legalName,
    isBusiness: identity.isBusiness,
    email: identity.email,
    phone: identity.phone,
    contactName: identity.contact?.name ?? null,
    typeLabel: identity.typeLabel,
    status: entry.profile.status,
  }
}

/** Matches the same identity fields operators can recognize in the picker. */
export function searchRequestCustomers(
  customers: readonly RequestCustomerOption[],
  query: string
): RequestCustomerOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return [...customers]

  return customers.filter((customer) =>
    [
      customer.name,
      customer.legalName,
      customer.email,
      customer.phone,
      customer.contactName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  )
}
