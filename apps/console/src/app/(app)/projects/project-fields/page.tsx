import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { ProjectFieldsData } from '@/features/projects/components/project-fields-data'
import { PROJECT_FIELDS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Project Fields' }

export default async function PlatformProjectFieldsPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Project Fields" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={PROJECT_FIELDS_SKELETON_COLUMNS}
            rows={8}
          />
        }
      >
        <ProjectFieldsData organizationId={org.id} />
      </Suspense>
    </Page>
  )
}
