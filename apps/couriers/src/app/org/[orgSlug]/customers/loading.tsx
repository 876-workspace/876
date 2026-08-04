'use client'

import { useParams } from 'next/navigation'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'
import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMERS_DROPDOWN_ACTIONS,
} from './_lib/customers-list-config'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      <ResourceToolbar
        title="Customers"
        titleFilter={
          <StatusFilterHeading
            label="Customers"
            value="all"
            options={CUSTOMER_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/customers/new`}
        primaryVariant="info"
        refresh
        dropdownActions={CUSTOMERS_DROPDOWN_ACTIONS}
      />
      <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />
    </Page>
  )
}
