import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { Skeleton } from '@876/ui/skeleton'
import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <Skeleton className="mb-6 h-9 w-full" />
      <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} />
    </Page>
  )
}
