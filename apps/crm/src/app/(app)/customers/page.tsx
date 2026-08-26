import { Suspense } from 'react'

import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'
import { CustomersTableData } from './_components/customers-table-data'

export const metadata = { title: 'Customers' }

export default function CustomersPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Customers"
        primaryLabel="Add"
        primaryHref="/customers/new"
        primaryVariant="info"
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <CustomersTableData />
      </Suspense>
    </Page>
  )
}
