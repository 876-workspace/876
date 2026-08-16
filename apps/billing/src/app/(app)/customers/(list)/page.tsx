import { Suspense } from 'react'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'
import { CustomersTableData } from '../_components/customers-table-data'
import { CustomersToolbar } from '../_components/customers-toolbar'

export const metadata = {
  title: 'Customers',
  description: 'Customers in the billing workspace.',
}

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function CustomersPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'

  return (
    <Page>
      <CustomersToolbar status={selectedStatus} />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <CustomersTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}
