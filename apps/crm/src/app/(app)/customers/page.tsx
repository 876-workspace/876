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

/**
 * Two-column grid used while a panel is open. Column 1 stacks the toolbar,
 * an optional error banner, and the list — so the list still sits under the
 * heading exactly as it does on the plain list view. The panel takes column 2
 * across ALL THREE rows, which is what lets it start at the very top rather
 * than being pushed down by the toolbar.
 *
 * The middle row is `auto` and collapses to zero height when no banner is
 * rendered, so the common case costs nothing.
 */
const SPLIT_GRID =
  'md:grid md:h-full md:min-h-0 md:grid-cols-[18rem_minmax(0,1fr)] md:grid-rows-[auto_auto_minmax(0,1fr)] md:gap-x-4 md:gap-y-0 lg:grid-cols-[20rem_minmax(0,1fr)]'

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
    <Page className={split ? SPLIT_GRID : ''}>
      <div className="md:col-start-1 md:row-start-1">
        <ResourceToolbar
          title="Customers"
          titleFilter={
            <StatusFilterHeading
              label="Customers"
              value={status}
              options={STATUS_OPTIONS}
            />
          }
          /*
           * The Add action belongs to the list view. While a panel is open the
           * panel is the subject, and a second create affordance beside it
           * competes with the record on screen — so the heading stays and the
           * button stands down. Reaching create from here is the row itself.
           */
          primaryLabel={split ? undefined : 'Add'}
          primaryHref={
            status !== 'all'
              ? `/customers?status=${status}&customer=new`
              : '/customers?customer=new'
          }
          primaryVariant="info"
        />
      </div>
      {/*
       * Keyed on status alone, NOT on the selected customer. Including the
       * customer id remounted this boundary on every row click, so each open
       * threw away the rendered split and flashed the skeleton — the blink.
       * The selection changes no data this component fetches, so the boundary
       * should survive it and let the panel animate in over live content.
       */}
      <Suspense
        key={status}
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
