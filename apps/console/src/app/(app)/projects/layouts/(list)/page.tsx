import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { LayoutsData } from '@/features/projects/components/layouts-data'
import { LAYOUTS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Layouts' }

export default async function PlatformLayoutsPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Layouts" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={LAYOUTS_SKELETON_COLUMNS} rows={8} />
        }
      >
        <LayoutsData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
