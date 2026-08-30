import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { CustomerSplitSkeleton } from './_components/customer-split-skeleton'
import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'
import { CustomersTableData } from './_components/customers-table-data'

export const metadata = { title: 'Customers' }

const STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All customers' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

type Props = {
  searchParams: Promise<{
    status?: string
    customer?: string
  }>
}

export default async function CustomersPage({ searchParams }: Props) {
  const { status = 'all', customer } = await searchParams
  const split = Boolean(customer)

  return (
    /*
     * With a panel open the page becomes a fixed-height flex column filling
     * the shell's scroll area, so the list and the panel each own their own
     * scrollbar instead of the whole main column scrolling as one.
     */
    <Page className={split ? 'md:flex md:h-full md:min-h-0 md:flex-col' : ''}>
      <div className="shrink-0">
        <ResourceToolbar
          title="Customers"
          titleFilter={
            <StatusFilterHeading
              label="Customers"
              value={status}
              options={STATUS_OPTIONS}
            />
          }
          primaryLabel="Add"
          primaryHref={
            status !== 'all'
              ? `/customers?status=${status}&customer=new`
              : '/customers?customer=new'
          }
          primaryVariant="info"
        />
      </div>
      <Suspense
        key={`${status}-${customer}`}
        fallback={
          customer ? (
            <CustomerSplitSkeleton />
          ) : (
            <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} rows={5} />
          )
        }
      >
        <CustomersTableData status={status} selectedId={customer} />
      </Suspense>
    </Page>
  )
}
