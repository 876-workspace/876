import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { CustomersTableData } from '../_components/customers-table-data'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'
import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMERS_DROPDOWN_ACTIONS,
} from '../_lib/customers-list-config'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function CustomersPage({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const selectedStatus =
    status === 'active' || status === 'suspended' ? status : 'all'

  return (
    <Page>
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
        primaryHref={`/${orgSlug}/customers/new`}
        primaryVariant="info"
        refresh
        dropdownActions={CUSTOMERS_DROPDOWN_ACTIONS}
      />
      <Suspense
        fallback={<DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />}
      >
        <CustomersTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}
