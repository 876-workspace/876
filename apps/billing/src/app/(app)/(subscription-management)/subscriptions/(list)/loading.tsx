import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'

import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'

export default function Loading() {
  return (
    <Page>
      <StreamingResourceToolbar
        title="Subscriptions"
        status="all"
        options={[
          { value: 'all', label: 'All', headingLabel: 'All Subscriptions' },
          { value: 'draft', label: 'Draft' },
          { value: 'trialing', label: 'Trialing' },
          { value: 'active', label: 'Active' },
          { value: 'paused', label: 'Paused' },
          { value: 'canceled', label: 'Canceled' },
          { value: 'ended', label: 'Ended' },
        ]}
        primary={{
          label: 'New',
          href: '/subscriptions/new',
          permission: 'subscriptions:write',
        }}
      />
      <div className="mb-4 flex gap-2" aria-hidden="true">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
      <DataTableSkeleton
        columns={[
          { label: 'Customer', cell: 'avatar' },
          { label: 'Product & plan' },
          { label: 'Recurring amount' },
          { label: 'Status', cell: 'badge' },
          { label: 'Renews / ends' },
          { label: 'Created' },
        ]}
        rows={5}
      />
    </Page>
  )
}
