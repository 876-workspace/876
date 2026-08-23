'use client'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { useParams, useSearchParams } from 'next/navigation'

import { SUBSCRIPTIONS_SKELETON_COLUMNS } from '../_components/subscriptions-skeleton-columns'
import { SUBSCRIPTION_STATUS_OPTIONS } from '../_components/subscription-status-options'

export default function Loading() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const selectedStatus =
    SUBSCRIPTION_STATUS_OPTIONS.find((option) => option.value === status)
      ?.value ?? 'all'

  return (
    <div>
      <ResourceToolbar
        title="Subscriptions"
        titleFilter={
          <StatusFilterHeading
            label="Subscriptions"
            value={selectedStatus}
            options={SUBSCRIPTION_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/orgs/${slug}/subscriptions/new`}
        primaryVariant="info"
        refresh
      />
      <DataTableSkeleton columns={SUBSCRIPTIONS_SKELETON_COLUMNS} rows={5} />
    </div>
  )
}

