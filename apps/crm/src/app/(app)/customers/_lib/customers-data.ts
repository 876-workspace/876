import 'server-only'
import { cache } from 'react'

import { resolveCustomerIdentity } from '@/features/customers/customer-identity'
import type { CrmCustomerRow } from '@/features/customers/types'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { crm } from '@/lib/services/crm'

type CustomerRowsResult = {
  rows: CrmCustomerRow[]
  error: Awaited<ReturnType<typeof crm.customerProfiles.list>>['error']
}

export const getCustomerRows = cache(async (): Promise<CustomerRowsResult> => {
  const context = await requireCrmContext()
  const result = await crm.customerProfiles.list(context.orgId)
  const rows: CrmCustomerRow[] = (result.data?.data ?? []).map(({ profile, customer }) => {
    const identity = resolveCustomerIdentity(customer, profile.billingCustomerId)
    return {
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
  })
  return { rows, error: result.error }
})

export async function getCustomerRow(customerId: string): Promise<CrmCustomerRow | null> {
  const { rows } = await getCustomerRows()
  return rows.find((row) => row.profileId === customerId) ?? null
}
