import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { APPS_SKELETON_COLUMNS } from './_components/apps-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <ResourceToolbar
        title="Apps"
        primaryLabel="New App"
        primaryHref="/apps/new"
        primaryVariant="info"
        refresh
      />
      <div className="mb-4 max-w-sm">
        <Skeleton className="h-9 w-full" />
      </div>
      <DataTableSkeleton columns={APPS_SKELETON_COLUMNS} />
    </Page>
  )
}
