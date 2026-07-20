import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { GlobeAltIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'

const DELIVERY_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Deliveries' },
  {
    value: 'scheduled',
    label: 'Scheduled',
    headingLabel: 'Scheduled Deliveries',
  },
  {
    value: 'out_for_delivery',
    label: 'Out for delivery',
    headingLabel: 'Out-for-delivery Deliveries',
  },
  {
    value: 'delivered',
    label: 'Delivered',
    headingLabel: 'Delivered Deliveries',
  },
  { value: 'failed', label: 'Failed', headingLabel: 'Failed Deliveries' },
  {
    value: 'returned',
    label: 'Returned',
    headingLabel: 'Returned Deliveries',
  },
]

const DELIVERY_STATUS_VALUES = new Set(
  DELIVERY_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function DeliveriesPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status && DELIVERY_STATUS_VALUES.has(status) ? status : 'all'
  const selectedLabel = DELIVERY_STATUS_OPTIONS.find(
    (option) => option.value === selectedStatus
  )?.label

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No deliveries yet.'
      : `No ${selectedLabel?.toLowerCase() ?? selectedStatus} deliveries.`

  return (
    <Page>
      <ResourceToolbar
        title="Deliveries"
        titleFilter={
          <StatusFilterHeading
            label="Deliveries"
            value={selectedStatus}
            options={DELIVERY_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/packages/deliveries/new`}
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete deliveries',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GlobeAltIcon />
          </EmptyMedia>
          <EmptyTitle>No deliveries</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
