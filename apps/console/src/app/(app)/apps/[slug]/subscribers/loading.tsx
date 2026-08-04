import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { SUBSCRIBERS_SKELETON_COLUMNS } from './_components/subscribers-skeleton-columns'

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="mb-2">
        <h2 className="876-page-title">Subscribers</h2>
      </div>
      <DataTableSkeleton columns={SUBSCRIBERS_SKELETON_COLUMNS} />
    </div>
  )
}
