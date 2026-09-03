import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { Suspense } from 'react'

import { PlatformOrganizationUnavailable } from '@/components/patterns/platform-organization-unavailable'
import { IssuesData } from '@/features/projects/components/issues-data'
import { ISSUES_SKELETON_COLUMNS } from '@/features/projects/components/issues-skeleton-columns'
import {
  isIssueStatus,
  ISSUE_STATUS_OPTIONS,
  type IssueFilterStatus,
} from '@/features/projects/issue-status'
import { getPlatformOrganization } from '@/lib/platform-org'

import { PLATFORM_PROJECTS_BASE } from '../../_lib/base'

export const metadata = { title: 'Issues' }

type Props = { searchParams: Promise<{ status?: string }> }

export default async function PlatformIssuesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus: IssueFilterStatus = isIssueStatus(status)
    ? status
    : 'all'

  return (
    <Page>
      <ResourceToolbar
        title="Issues"
        titleFilter={
          <StatusFilterHeading
            label="Issues"
            value={selectedStatus}
            options={ISSUE_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`${PLATFORM_PROJECTS_BASE}/issues/new`}
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={5} />
        }
      >
        <IssuesSection status={selectedStatus} />
      </Suspense>
    </Page>
  )
}

async function IssuesSection({ status }: { status: IssueFilterStatus }) {
  const org = await getPlatformOrganization()
  if (!org) return <PlatformOrganizationUnavailable />

  return (
    <IssuesData
      organizationId={org.id}
      base={PLATFORM_PROJECTS_BASE}
      status={status}
    />
  )
}
