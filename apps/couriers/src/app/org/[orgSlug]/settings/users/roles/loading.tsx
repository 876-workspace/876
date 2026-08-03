import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { ROLES_SKELETON_COLUMNS } from './_components/roles-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <Skeleton className="mb-4 h-5 w-16" />
      <Skeleton className="mb-6 h-9 w-full" />
      <DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />
    </Page>
  )
}
