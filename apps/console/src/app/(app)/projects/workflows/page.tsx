import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { WorkflowsData } from '@/features/projects/components/workflows-data'
import { WORKFLOWS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Workflows' }

export default async function PlatformWorkflowsPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Workflows" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={WORKFLOWS_SKELETON_COLUMNS} rows={8} />
        }
      >
        <WorkflowsData organizationId={org.id} />
      </Suspense>
    </Page>
  )
}
