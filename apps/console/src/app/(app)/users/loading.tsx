import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { USERS_SKELETON_COLUMNS } from './_components/users-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <ResourceToolbar
        title="Users"
        primaryLabel="Add"
        primaryHref="/users/new"
        primaryVariant="info"
        refresh
        dropdownActions={[
          { label: 'Import', icon: 'import' },
          { label: 'Export', icon: 'export' },
          {
            label: 'Delete users',
            icon: 'delete',
            destructive: true,
            separator: true,
          },
        ]}
      />
      <div className="mb-4 max-w-sm">
        <Skeleton className="h-9 w-full" />
      </div>
      <DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />
    </Page>
  )
}
