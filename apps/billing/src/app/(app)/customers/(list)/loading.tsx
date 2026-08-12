'use client'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { CustomersToolbar } from '../_components/customers-toolbar'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <CustomersToolbar status="all" />
      <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} rows={5} />
    </Page>
  )
}
