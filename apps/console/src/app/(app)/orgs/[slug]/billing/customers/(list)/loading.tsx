'use client'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { PageBreadcrumb } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { useParams, useSearchParams } from 'next/navigation'
import { CUSTOMERS_SKELETON_COLUMNS } from '../_components/customers-skeleton-columns'

const CUSTOMER_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Customers' },
  { value: 'active', label: 'Active', headingLabel: 'Active Customers' },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Customers' },
]

export default function Loading() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const selectedStatus =
    status === 'active' || status === 'archived' ? status : 'all'

  return (
    <div>
      <PageBreadcrumb
        href={`/orgs/${slug}/billing`}
        label="Billing"
        className="mb-2"
      />
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
        primaryHref={`/orgs/${slug}/billing/customers/new`}
        primaryVariant="info"
        refresh
      />
      <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />
    </div>
  )
}
