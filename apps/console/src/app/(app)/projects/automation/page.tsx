import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { AutomationData } from '@/features/projects/components/automation-data'
import { AUTOMATION_RULES_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Automation' }

export default async function PlatformAutomationPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Automation" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={AUTOMATION_RULES_SKELETON_COLUMNS}
            rows={8}
          />
        }
      >
        <AutomationData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
