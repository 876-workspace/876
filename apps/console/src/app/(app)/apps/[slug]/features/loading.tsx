import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { FEATURES_SKELETON_COLUMNS } from './_components/features-skeleton-columns'

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="text-lg font-medium tracking-tight">Feature Flags</h2>
      </div>
      <DataTableSkeleton columns={FEATURES_SKELETON_COLUMNS} />
    </div>
  )
}
