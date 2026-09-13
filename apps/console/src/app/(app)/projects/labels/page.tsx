import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { LabelsData } from '@/features/projects/components/labels-data'
import { LABELS_SKELETON_COLUMNS } from '@/features/projects/components/labels-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Labels' }

export default function PlatformLabelsPage() {
  return (
    <Page>
      <ResourceToolbar
        title="Labels"
        titleFilter={
          <StatusFilterHeading
            label="Labels"
            value="all"
            options={[{ value: 'all', label: 'All Labels' }]}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={LABELS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <LabelsSection />
      </Suspense>
    </Page>
  )
}

async function LabelsSection() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return <LabelsData organizationId={org.id} />
}
