import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { BillingResourceListShell } from '@/components/patterns/billing-resource-list-shell'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'
import { CustomersTableData } from './_components/customers-table-data'

const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

export default async function CustomersLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('customers:read')

  return (
    <BillingResourceListShell
      title="Customers"
      options={CUSTOMER_STATUS_OPTIONS}
      primary={{ label: 'New', href: '/customers/new', permission: 'customers:write' }}
      dropdownAction={{
        label: 'Import',
        href: '/customers/import',
        permission: 'customers:write',
      }}
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={CUSTOMERS_SKELETON_COLUMNS}
              rows={5}
            />
          }
        >
          <CustomersTableData />
        </Suspense>
      }
    >
      {children}
    </BillingResourceListShell>
  )
}
