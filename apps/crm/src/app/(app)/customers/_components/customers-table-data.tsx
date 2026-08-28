import { get876Client } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { resolveCustomerIdentity } from '@/features/customers/customer-identity'
import { CustomersTable, type CrmCustomerRow } from './customers-table'

/**
 * Data half of the customers page — kept separate from `page.tsx` so the route
 * file only contains Next.js exports. Rendered inside a Suspense boundary; the
 * toolbar and skeleton appear immediately while this streams in.
 */
export async function CustomersTableData() {
  const context = await requireCrmContext()
  const $876 = await get876Client()
  const result = await $876.customerProfiles.list(context.orgId)
  if (result.error) throw new Error(result.error.message)

  const rows: CrmCustomerRow[] = result.data.data.map(
    ({ profile, customer }) => {
      // The row is about the party; the contact is a second column, not the
      // party's own email. Reading `customer.email` for both put a business's
      // owner in the customer's email cell.
      const identity = resolveCustomerIdentity(
        customer,
        profile.billingCustomerId
      )
      return {
        profileId: profile.id,
        billingCustomerId: profile.billingCustomerId,
        name: identity.name,
        isBusiness: identity.isBusiness,
        email: identity.email,
        phone: identity.phone,
        contactName: identity.contact?.name ?? null,
        contactEmail: identity.contact?.email ?? null,
        status: profile.status,
      }
    }
  )

  return <CustomersTable customers={rows} />
}
