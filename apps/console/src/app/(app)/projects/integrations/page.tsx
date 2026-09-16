import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { IntegrationsData } from '@/features/projects/components/integrations-data'
import { INTEGRATIONS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Integrations' }

export default async function PlatformIntegrationsPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Integrations" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={INTEGRATIONS_SKELETON_COLUMNS} rows={8} />
        }
      >
        <IntegrationsData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
