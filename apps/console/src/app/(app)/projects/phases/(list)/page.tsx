import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { PHASES_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { PhasesData } from '@/features/projects/components/phases-data'
import {
  isPhaseStatus,
  PHASE_STATUS_OPTIONS,
} from '@/features/projects/phase-status'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Phases' }

export default async function PlatformPhasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const org = await getPlatformOrganization()
  const { status } = await searchParams
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar
        title="Phases"
        titleFilter={
          <StatusFilterHeading
            label="Phases"
            value={isPhaseStatus(status) ? status : 'all'}
            options={PHASE_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={PHASES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <PhasesData
          organizationId={org.id}
          base={projectsBase(null)}
          status={isPhaseStatus(status) ? status : undefined}
        />
      </Suspense>
    </Page>
  )
}
