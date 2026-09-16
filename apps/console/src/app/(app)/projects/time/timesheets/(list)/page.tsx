import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { TimesheetsData } from '@/features/projects/components/timesheets-data'
import { TIMESHEETS_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import {
  isApprovalStatus,
  TIMESHEET_STATUS_OPTIONS,
} from '@/features/projects/time-status'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Timesheets' }

export default async function PlatformTimesheetsPage({
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
        title="Timesheets"
        titleFilter={
          <StatusFilterHeading
            label="Timesheets"
            value={isApprovalStatus(status) ? status : 'all'}
            options={TIMESHEET_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TIMESHEETS_SKELETON_COLUMNS} rows={8} />
        }
      >
        <TimesheetsData
          organizationId={org.id}
          base={projectsBase(null)}
          status={isApprovalStatus(status) ? status : undefined}
        />
      </Suspense>
    </Page>
  )
}
