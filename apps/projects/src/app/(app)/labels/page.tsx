import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LabelsData } from '@/features/projects/components/labels-data'
import { LABELS_SKELETON_COLUMNS } from '@876/projects-ui/skeleton-columns'
import { requireAppPermission } from '@/lib/auth/require-projects-context'

export const metadata: Metadata = { title: 'Labels' }

export default async function LabelsPage() {
  await requireAppPermission('labels.view')

  return (
    <div className="px-4 pt-5 pb-8 sm:px-6 lg:px-8">
      <ResourceToolbar
        title="Labels"
        primaryLabel="Add"
        primaryHref="/labels/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton columns={LABELS_SKELETON_COLUMNS} rows={6} />
        }
      >
        <LabelsData />
      </Suspense>
    </div>
  )
}
