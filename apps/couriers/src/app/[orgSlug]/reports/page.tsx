import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Squares2X2Icon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

const REPORT_STATUS_OPTIONS = [
  { value: 'all', label: 'All Reports', headingLabel: 'All Reports' },
]

export default function ReportsPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Reports"
        titleFilter={
          <StatusFilterHeading
            label="Reports"
            value="all"
            options={REPORT_STATUS_OPTIONS}
          />
        }
        refresh
        dropdownActions={[{ label: 'Export', icon: 'export', disabled: true }]}
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Squares2X2Icon />
          </EmptyMedia>
          <EmptyTitle>No reports</EmptyTitle>
          <EmptyDescription>No reports yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
