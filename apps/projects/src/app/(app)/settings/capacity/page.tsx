import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import { CapacityListData } from '@/features/reports/components/capacity-list-data'
import { CAPACITY_SKELETON_COLUMNS } from '@/features/reports/components/report-skeleton-columns'
import {
  requireAppAccess,
  requireProjectsContext,
} from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Capacity' }

export default async function CapacitySettingsPage() {
  await requireAppAccess({ module: 'projects', permission: 'projects.edit' })
  const { orgId } = await requireProjectsContext()

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <ResourceToolbar
        title="Capacity"
        primaryLabel="Add"
        primaryHref="/settings/capacity/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={CAPACITY_SKELETON_COLUMNS} rows={5} />
        }
      >
        <CapacityListData orgId={orgId} />
      </Suspense>
    </div>
  )
}
