import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Skeleton } from '@876/ui/skeleton'
import { SUBSCRIPTIONS_SKELETON_COLUMNS } from './_components/subscriptions-skeleton-columns'

export default function Loading() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="mb-2 h-7 w-24" />
        <h1 className="876-page-title mt-2">Subscriptions</h1>
      </div>
      <DataTableSkeleton columns={SUBSCRIPTIONS_SKELETON_COLUMNS} />
    </div>
  )
}
