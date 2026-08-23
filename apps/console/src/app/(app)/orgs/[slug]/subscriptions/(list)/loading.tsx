'use client'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { useParams } from 'next/navigation'

import { SUBSCRIPTIONS_SKELETON_COLUMNS } from '../_components/subscriptions-skeleton-columns'
import { SUBSCRIPTION_STATUS_OPTIONS } from '../_components/subscription-status-options'

/**
 * Route-level fallback. It reads `useParams()` only — `useSearchParams()`
 * suspends during prerender and there is no boundary above a `loading.tsx`,
 * so the status filter always falls back to `all` here.
 */
export default function Loading() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div>
      <ResourceToolbar
        title="Subscriptions"
        titleFilter={
          <StatusFilterHeading
            label="Subscriptions"
            value="all"
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
