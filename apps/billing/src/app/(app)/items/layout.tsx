import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { BillingResourceListShell } from '@/components/patterns/billing-resource-list-shell'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'
import { ItemsTableData } from './_components/items-table-data'

const ITEM_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

export default async function ItemsLayout({ children }: { children: ReactNode }) {
  await requirePagePermission('catalog:read')

  return (
    <BillingResourceListShell
      title="Items"
      options={ITEM_STATUS_OPTIONS}
      primary={{ label: 'New', href: '/items/new', permission: 'catalog:write' }}
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} rows={5} />
          }
        >
          <ItemsTableData />
        </Suspense>
      }
    >
      {children}
    </BillingResourceListShell>
  )
}
