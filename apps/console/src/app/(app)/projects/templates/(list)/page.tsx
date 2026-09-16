import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { TemplatesData } from '@/features/projects/components/templates-data'
import { TEMPLATES_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Templates' }

export default async function PlatformTemplatesPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Templates" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TEMPLATES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <TemplatesData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
