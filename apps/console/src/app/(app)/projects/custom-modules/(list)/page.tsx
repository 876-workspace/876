import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { CustomModulesData } from '@/features/projects/components/custom-modules-data'
import { CUSTOM_MODULES_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Custom modules' }

export default async function PlatformCustomModulesPage() {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar title="Custom modules" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={CUSTOM_MODULES_SKELETON_COLUMNS}
            rows={8}
          />
        }
      >
        <CustomModulesData organizationId={org.id} base={projectsBase(null)} />
      </Suspense>
    </Page>
  )
}
