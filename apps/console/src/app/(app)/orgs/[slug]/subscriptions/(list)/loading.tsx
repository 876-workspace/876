'use client'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { useParams, useSearchParams } from 'next/navigation'
import { SUBSCRIPTIONS_SKELETON_COLUMNS } from '../_components/subscriptions-skeleton-columns'

const SUBSCRIPTION_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Subscriptions' },
  { value: 'active', label: 'Active', headingLabel: 'Active Subscriptions' },
  { value: 'trialing', label: 'Trialing', headingLabel: 'Trialing Subscriptions' },
  { value: 'past_due', label: 'Past due', headingLabel: 'Past Due Subscriptions' },
  { value: 'paused', label: 'Paused', headingLabel: 'Paused Subscriptions' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Subscriptions' },
]

export default function Loading() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const status = searchParams.get('status') ?? 'all'
  const selectedStatus = SUBSCRIPTION_STATUS_OPTIONS.some(
    (o) => o.value === status
  )
    ? status
    : 'all'

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
      <DataTableSkeleton columns={SUBSCRIPTIONS_SKELETON_COLUMNS} />
    </div>
  )
}
