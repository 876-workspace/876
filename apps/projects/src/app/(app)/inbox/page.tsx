import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { CapturesData } from '@/features/projects/components/captures-data'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Inbox' }
type Props = { searchParams: Promise<{ status?: string }> }
const options = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'promoted', label: 'Promoted' },
  { value: 'discarded', label: 'Discarded' },
  { value: 'all', label: 'All' },
]

export default async function InboxPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.view' })
  const selected = (await searchParams).status
  const status =
    selected === 'promoted' || selected === 'discarded' || selected === 'all'
      ? selected
      : 'inbox'
  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Inbox"
        titleFilter={
          <StatusFilterHeading label="Inbox" value={status} options={options} />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Idea' },
              { label: 'Status', cell: 'badge' },
              { label: 'Project hint' },
            ]}
            rows={6}
          />
        }
      >
        <CapturesData status={status === 'all' ? undefined : status} />
      </Suspense>
    </div>
  )
}
