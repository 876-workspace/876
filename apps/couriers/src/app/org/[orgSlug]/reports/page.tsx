import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Squares2X2Icon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'

const REPORT_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Reports' },
  { value: 'ready', label: 'Ready', headingLabel: 'Ready Reports' },
  {
    value: 'scheduled',
    label: 'Scheduled',
    headingLabel: 'Scheduled Reports',
  },
  { value: 'archived', label: 'Archived', headingLabel: 'Archived Reports' },
]

const REPORT_STATUS_VALUES = new Set(
  REPORT_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

type Props = {
  searchParams: Promise<{ status?: string }>
}

export default async function ReportsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus =
    status && REPORT_STATUS_VALUES.has(status) ? status : 'all'
  const selectedLabel = REPORT_STATUS_OPTIONS.find(
    (option) => option.value === selectedStatus
  )?.label

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No reports yet.'
      : `No ${selectedLabel?.toLowerCase() ?? selectedStatus} reports.`

  return (
    <Page>
      <ResourceToolbar
        title="Reports"
        titleFilter={
          <StatusFilterHeading
            label="Reports"
            value={selectedStatus}
            options={REPORT_STATUS_OPTIONS}
          />
        }
        refresh
        dropdownActions={[{ label: 'Export', icon: 'export' }]}
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Squares2X2Icon />
          </EmptyMedia>
          <EmptyTitle>No reports</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
