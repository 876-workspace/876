import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { QueueListIcon } from '@876/ui/icons'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@/components/resource-toolbar'
import { StatusFilterHeading } from '@/components/status-filter-heading'

const MANIFEST_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Manifests' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Manifests' },
  { value: 'sealed', label: 'Sealed', headingLabel: 'Sealed Manifests' },
  {
    value: 'in_transit',
    label: 'In transit',
    headingLabel: 'In-transit Manifests',
  },
  { value: 'arrived', label: 'Arrived', headingLabel: 'Arrived Manifests' },
  {
    value: 'customs_hold',
    label: 'Customs hold',
    headingLabel: 'Customs-hold Manifests',
  },
  { value: 'cleared', label: 'Cleared', headingLabel: 'Cleared Manifests' },
]

const MANIFEST_STATUS_VALUES = new Set(
  MANIFEST_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function ManifestsPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status && MANIFEST_STATUS_VALUES.has(status) ? status : 'all'
  const selectedLabel = MANIFEST_STATUS_OPTIONS.find(
    (option) => option.value === selectedStatus
  )?.label

  const emptyMessage =
    selectedStatus === 'all'
      ? 'No manifests yet.'
      : `No ${selectedLabel?.toLowerCase() ?? selectedStatus} manifests.`

  return (
    <Page>
      <ResourceToolbar
        title="Manifests"
        titleFilter={
          <StatusFilterHeading
            label="Manifests"
            value={selectedStatus}
            options={MANIFEST_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/packages/manifest/new`}
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete manifests',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      <Empty className="py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <QueueListIcon />
          </EmptyMedia>
          <EmptyTitle>No manifests</EmptyTitle>
          <EmptyDescription>{emptyMessage}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Page>
  )
}
