import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { ORGS_SKELETON_COLUMNS } from './_components/orgs-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <ResourceToolbar
        title="Organizations"
        primaryLabel="Add"
        primaryHref="/org/new"
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete organizations',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-9 w-44" />
      </div>
      <DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} />
    </Page>
  )
}
