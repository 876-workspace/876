import { UsersIcon } from '@876/ui/icons'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@876/ui/empty'

import { $876 } from '@/lib/876'
import { requireCrmContext } from '@/lib/auth/require-crm-context'
import { CustomersTable, type CrmCustomerRow } from './customers-table'

/**
 * Data half of the customers page — kept separate from `page.tsx` so the route
 * file only contains Next.js exports. Rendered inside a Suspense boundary; the
 * toolbar and skeleton appear immediately while this streams in.
 */
export async function CustomersTableData() {
  const context = await requireCrmContext()
  const result = await $876.customerProfiles.list(context.orgId)
  if (result.error) throw new Error(result.error.message)

  const rows: CrmCustomerRow[] = result.data.data.map(({ profile, customer }) => ({
    profileId: profile.id,
    billingCustomerId: profile.billingCustomerId,
    name: customer?.name ?? profile.billingCustomerId,
    email: customer?.email ?? null,
    phone: customer?.phone ?? null,
    status: profile.status,
  }))

  if (rows.length === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UsersIcon />
          </EmptyMedia>
          <EmptyTitle>No customers yet</EmptyTitle>
          <EmptyDescription>Add your first customer to get started.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return <CustomersTable customers={rows} />
}
