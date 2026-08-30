import { AppError } from '@876/ui/app-error'

import { resolveCustomerIdentity } from '@/features/customers/customer-identity'
import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'

import { MOCK_CUSTOMERS } from '../_lib/mock-customers'
import { CustomerSplit } from './customer-split'
import type { CrmCustomerRow } from './customers-table'

type Props = {
  status?: string
  selectedId?: string
}

/**
 * Data half of the customers page — kept separate from `page.tsx` so the route
 * file only contains Next.js exports. Rendered inside a Suspense boundary; the
 * toolbar and skeleton appear immediately while this streams in.
 */
export async function CustomersTableData({ status, selectedId }: Props) {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const result = await $876.customerProfiles.list(context.orgId)

  const apiRows: CrmCustomerRow[] = (result.data?.data ?? []).map(
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

  const existingIds = new Set(apiRows.map((r) => r.profileId))
  const remainingMocks = MOCK_CUSTOMERS.filter(
    (m) => !existingIds.has(m.profileId)
  )
  let rows = [...apiRows, ...remainingMocks]

  if (status === 'active') {
    rows = rows.filter((r) => r.status === 'ACTIVE')
  } else if (status === 'inactive') {
    rows = rows.filter((r) => r.status === 'INACTIVE')
  }

  return (
    // Participates in the page's flex column so the split below can bound its
    // own height; inert on the plain-table route, where Page is not a flexbox.
    <div className="space-y-3 md:flex md:min-h-0 md:flex-1 md:flex-col">
      {result.error ? (
        <AppError
          title="Some customer data could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <CustomerSplit customers={rows} selectedId={selectedId} />
    </div>
  )
}
