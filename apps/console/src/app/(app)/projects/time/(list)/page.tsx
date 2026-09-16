import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { projectsBase } from '@/features/orgs/app-workspaces'
import { TimeEntriesData } from '@/features/projects/components/time-entries-data'
import { OPERATOR_TIME_ENTRY_SKELETON_COLUMNS } from '@/features/projects/components/operator-skeleton-columns'
import {
  isApprovalStatus,
  TIME_ENTRY_STATUS_OPTIONS,
} from '@/features/projects/time-status'
import { getPlatformOrganization } from '@/lib/platform-org'

export const metadata = { title: 'Time' }

export default async function PlatformTimePage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string
    status?: string
    billable?: string
  }>
}) {
  const org = await getPlatformOrganization()
  const params = await searchParams
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <Page>
      <ResourceToolbar
        title="Time"
        titleFilter={
          <StatusFilterHeading
            label="Time"
            value={isApprovalStatus(params.status) ? params.status : 'all'}
            options={TIME_ENTRY_STATUS_OPTIONS}
          />
        }
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={OPERATOR_TIME_ENTRY_SKELETON_COLUMNS}
            rows={8}
          />
        }
      >
        <TimeEntriesData
          organizationId={org.id}
          base={projectsBase(null)}
          projectId={params.project?.trim() || undefined}
          approvalStatus={
            isApprovalStatus(params.status) ? params.status : undefined
          }
          billable={
            params.billable === 'true'
              ? true
              : params.billable === 'false'
                ? false
                : undefined
          }
        />
      </Suspense>
    </Page>
  )
}
