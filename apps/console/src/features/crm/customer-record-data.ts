import 'server-only'

import type { CrmCustomerRow } from '@876/crm-ui/customer-list'
import { cache } from 'react'

import { crm } from '@/lib/services/crm'

import { resolveCustomerIdentity } from './customer-identity'

/**
 * One organization's CRM customer record, normalized to the shared UI shape.
 * React cache keeps the layout and active tab from issuing duplicate CRM reads
 * during one render.
 */
export const loadOrgCustomerRecord = cache(
  async (organizationId: string, customerId: string) => {
    const result = await crm.customerProfiles.retrieve(organizationId, customerId)
    if (!result.data) return { row: null, result }

    const { profile, customer } = result.data
    const identity = resolveCustomerIdentity(customer, profile.billingCustomerId)
    const row: CrmCustomerRow = {
      profileId: profile.id,
      billingCustomerId: profile.billingCustomerId,
      name: identity.name,
      legalName: identity.legalName,
      isBusiness: identity.isBusiness,
      typeLabel: identity.typeLabel,
      email: identity.email,
      phone: identity.phone,
      contactName: identity.contact?.name ?? null,
      contactEmail: identity.contact?.email ?? null,
      contactPhone: identity.contact?.phone ?? null,
      contactUserId: identity.contact?.userId ?? null,
      contactAvatar: identity.contact?.avatar ?? null,
      ownerId: profile.ownerId ?? null,
      status: profile.status,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    }

    return { row, result }
  }
)
