import { Clock } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'

import { requireAppPermission } from '@/lib/auth/guards'

import { TimeEntriesTable } from './_components/time-entries-table'

export const metadata = {
  title: 'Time Tracking',
  description: 'Track billable hours and convert them to invoices.',
}

const TIME_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All Time Entries', headingLabel: 'All Time Entries' },
]

export default async function TimeTrackingPage() {
  await requireAppPermission('settings.view')

  return (
    <Page>
      <ResourceToolbar
        title="Time Tracking"
        titleFilter={
          <StatusFilterHeading
            label="Time Tracking"
            value="all"
            options={TIME_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref="/time-tracking/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Task', cell: 'avatar' as const },
              { label: 'Customer' },
              { label: 'Hours' },
              { label: 'Amount' },
              { label: 'Status', cell: 'badge' as const },
            ]}
            rows={5}
          />
        }
      >
        <TimeEntriesTableData />
      </Suspense>
    </Page>
  )
}

async function TimeEntriesTableData() {
  return (
    <TimeEntriesTable
      entries={[]}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Clock />
            </EmptyMedia>
            <EmptyTitle>No time entries yet</EmptyTitle>
            <EmptyDescription>
              Log billable hours and convert them into invoices. Columns can be
              adjusted later.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
