import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { CyclesData } from '@/features/projects/components/cycles-data'
import {
  isCycleStatus,
  CYCLE_STATUS_OPTIONS,
} from '@/features/projects/cycle-status'
import { CYCLES_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Cycles' }

export default async function PlatformCyclesPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; status?: string }>
}) {
  const org = await getPlatformOrganization()
  const { project, status } = await searchParams
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar
        title="Cycles"
        titleFilter={
          <StatusFilterHeading
            label="Cycles"
            value={isCycleStatus(status) ? status : 'all'}
            options={CYCLE_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CYCLES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <CyclesData
          organizationId={org.id}
          base={projectsBase(null)}
          projectId={project?.trim() || undefined}
          status={isCycleStatus(status) ? status : undefined}
        />
      </Suspense>
    </Page>
  )
}
