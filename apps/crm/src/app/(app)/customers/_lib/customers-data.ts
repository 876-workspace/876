import 'server-only'
import { cache } from 'react'

import { resolveCustomerIdentity } from '@/features/customers/customer-identity'
import type { CrmCustomerRow } from '@/features/customers/types'
import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

type CustomerRowsResult = {
  rows: CrmCustomerRow[]
  error: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof get876Client>>['customerProfiles']['list']
    >
  >['error']
}

/**
 * The org's customer rows, resolved once per request.
 *
 * Every surface under `/customers` needs the same list — the list column in the
 * layout, the card header, and each tab page. `cache` collapses those into a
 * single API call per request; without it, opening a tab would issue one list
 * request per component that needs the record.
 */
export const getCustomerRows = cache(async (): Promise<CustomerRowsResult> => {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const result = await $876.customerProfiles.list(context.orgId)

  const rows: CrmCustomerRow[] = (result.data?.data ?? []).map(
    ({ profile, customer }) => {
      const identity = resolveCustomerIdentity(
        customer,
        profile.billingCustomerId
      )
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
    }
  )

  return { rows, error: result.error }
})

/** One customer row, or `null` when the id matches nothing in the org. */
export async function getCustomerRow(
  customerId: string
): Promise<CrmCustomerRow | null> {
  const { rows } = await getCustomerRows()
  return rows.find((row) => row.profileId === customerId) ?? null
}

/*
 * Follow-up: the status filter is applied in the client list component because
 * a layout cannot read `searchParams`. The right fix is a `status` parameter on
 * `customerProfiles.list` so the API filters and paginates together — filtering
 * after the fetch silently breaks pagination once this list grows past one page.
 */
