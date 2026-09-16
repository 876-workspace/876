import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { TimesheetApprovalsData } from '@/features/time/components/approvals-data'
import { TIMESHEET_SKELETON_COLUMNS } from '@/features/time/components/time-summary-rows'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Time approvals' }

export default async function TimeApprovalsPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId, userId } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/time" label="Time" className="mb-4" />
      <ResourceToolbar title="Approvals" refresh />
      <Suspense
        fallback={
          <DataTableSkeleton columns={TIMESHEET_SKELETON_COLUMNS} rows={4} />
        }
      >
        <TimesheetApprovalsData orgId={orgId} userId={userId} />
      </Suspense>
    </div>
  )
}
