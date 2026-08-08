import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { PackagesTable } from './_components/packages-table'
import { FAKE_PACKAGES } from './_lib/fake-packages'

const PACKAGE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Packages' },
  {
    value: 'pre_alert',
    label: 'Pre-alert',
    headingLabel: 'Pre-alert Packages',
  },
  { value: 'received', label: 'Received', headingLabel: 'Received Packages' },
  {
    value: 'in_transit',
    label: 'In transit',
    headingLabel: 'In-transit Packages',
  },
  { value: 'arrived', label: 'Arrived', headingLabel: 'Arrived Packages' },
  {
    value: 'ready_for_pickup',
    label: 'Ready for pickup',
    headingLabel: 'Ready for Pickup Packages',
  },
  {
    value: 'collected',
    label: 'Collected',
    headingLabel: 'Collected Packages',
  },
  {
    value: 'unclaimed',
    label: 'Unclaimed',
    headingLabel: 'Unclaimed Packages',
  },
]

const PACKAGE_STATUS_VALUES = new Set(
  PACKAGE_STATUS_OPTIONS.map((option) => option.value).filter(
    (value) => value !== 'all'
  )
)

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function PackagesPage({ params, searchParams }: Props) {
  const { orgSlug } = await params
  const { status } = await searchParams
  const selectedStatus =
    status && PACKAGE_STATUS_VALUES.has(status) ? status : 'all'
  return (
    <Page>
      <ResourceToolbar
        title="Packages"
        titleFilter={
          <StatusFilterHeading
            label="Packages"
            value={selectedStatus}
            options={PACKAGE_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/${orgSlug}/packages/new`}
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete packages',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />

      <PackagesTable packages={FAKE_PACKAGES} />
    </Page>
  )
}
