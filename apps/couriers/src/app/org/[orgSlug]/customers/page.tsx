import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Skeleton } from '@876/ui/skeleton'

import { CustomersTableData } from './_components/customers-table-data'
import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'

const CUSTOMER_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  {
    value: 'suspended',
    label: 'Suspended',
    headingLabel: 'Suspended Customers',
  },
]

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default function CustomersPage({ params, searchParams }: Props) {
  return (
    <Page>
      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <CustomersToolbar params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense
        fallback={<DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />}
      >
        <CustomersTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function CustomersToolbar({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const selectedStatus =
    status === 'active' || status === 'suspended' ? status : 'all'

  return (
    <ResourceToolbar
      title="Customers"
      titleFilter={
        <StatusFilterHeading
          label="Customers"
          value={selectedStatus}
          options={CUSTOMER_STATUS_OPTIONS}
        />
      }
      primaryLabel="Add"
      primaryHref={`/org/${orgSlug}/customers/new`}
      primaryVariant="info"
      refresh
      dropdownActions={[
        { label: 'Import', icon: 'import' },
        { label: 'Export', icon: 'export' },
        { label: 'Delete', icon: 'delete', destructive: true, separator: true },
      ]}
    />
  )
}
