import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { ImportsData } from '@/features/projects/components/imports-data'
import { IMPORT_JOBS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Imports' }

export default async function PlatformImportsPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Imports" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={IMPORT_JOBS_SKELETON_COLUMNS} rows={8} />
        }
      >
        <ImportsData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
