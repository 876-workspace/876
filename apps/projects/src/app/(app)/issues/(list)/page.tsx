import {
  isIssueStatus,
  ISSUE_STATUS_OPTIONS,
  type IssueFilterStatus,
} from '@876/projects-ui/status-options'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { IssuesData } from '@/features/projects/components/issues-data'
import { ISSUES_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { requireAppAccess } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Issues' }

type Props = { searchParams: Promise<{ status?: string }> }

export default async function IssuesPage({ searchParams }: Props) {
  await requireAppAccess({ module: 'issues', permission: 'issues.view' })
  const { status } = await searchParams
  const selectedStatus: IssueFilterStatus = isIssueStatus(status)
    ? status
    : 'all'

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
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
        primaryHref="/issues/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={ISSUES_SKELETON_COLUMNS} rows={8} />
        }
      >
        <IssuesData status={selectedStatus} />
      </Suspense>
    </div>
  )
}
