import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { FlagIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'

const PRE_ALERT_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Pre-alerts' },
  { value: 'pending', label: 'Pending', headingLabel: 'Pending Pre-alerts' },
  { value: 'received', label: 'Received', headingLabel: 'Received Pre-alerts' },
  {
    value: 'cancelled',
    label: 'Cancelled',
    headingLabel: 'Cancelled Pre-alerts',
  },
]

const PRE_ALERT_STATUS_VALUES = new Set(
  PRE_ALERT_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function PreAlertsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status && PRE_ALERT_STATUS_VALUES.has(status) ? status : 'all'
  const selectedLabel = PRE_ALERT_STATUS_OPTIONS.find(
    (option) => option.value === selectedStatus
  )?.label

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No pre-alerts yet.'
      : `No ${selectedLabel?.toLowerCase() ?? selectedStatus} pre-alerts.`

  return (
    <Page>
      <ResourceToolbar
        title="Pre-alerts"
        titleFilter={
          <StatusFilterHeading
            label="Pre-alerts"
            value={selectedStatus}
            options={PRE_ALERT_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/packages/pre-alerts/new`}
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete pre-alerts',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FlagIcon />
          </EmptyMedia>
          <EmptyTitle>No pre-alerts</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
