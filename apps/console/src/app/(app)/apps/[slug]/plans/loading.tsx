import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { PLANS_SKELETON_COLUMNS } from './_components/plans-skeleton-columns'

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Plans</h2>
      </div>
      <DataTableSkeleton columns={PLANS_SKELETON_COLUMNS} />
    </div>
  )
}
