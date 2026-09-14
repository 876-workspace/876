import type { Customer } from '@876/crm'

import type { CrmCustomerRow } from './customer-list'

/** Maps a CRM customer profile plus registry identity into the shared table row. */
export function toCrmCustomerRow(entry: Customer): CrmCustomerRow {
  const customer = entry.customer
  const primary = customer?.primaryContact ?? null
  const contactName = primary
    ? [primary.firstName, primary.lastName].filter(Boolean).join(' ').trim() ||
      null
    : null

  return {
    profileId: entry.profile.id,
    billingCustomerId: entry.profile.billingCustomerId,
    name: customer?.name ?? entry.profile.billingCustomerId,
    legalName:
      customer?.customerKind === 'BUSINESS'
        ? (customer.companyName ?? null)
        : null,
    isBusiness: customer?.customerKind === 'BUSINESS',
    typeLabel:
      customer?.customerKind === 'BUSINESS' ? 'Business' : 'Individual',
    email: customer?.email ?? primary?.email ?? null,
    phone:
      customer?.phone ?? primary?.workPhone ?? primary?.mobilePhone ?? null,
    contactName,
    contactEmail: primary?.email ?? null,
    contactPhone: primary?.workPhone ?? primary?.mobilePhone ?? null,
    contactUserId: primary?.userId ?? null,
    contactAvatar: primary?.avatar ?? null,
    ownerId: entry.profile.ownerId,
    status: entry.profile.status,
    createdAt: entry.profile.createdAt,
    updatedAt: entry.profile.updatedAt,
  }
}
