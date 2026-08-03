import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { CUSTOMERS_SKELETON_COLUMNS } from './_components/customers-skeleton-columns'

export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="876-page-title">Billing customers</h1>
        </div>
      </div>
      <DataTableSkeleton columns={CUSTOMERS_SKELETON_COLUMNS} />
    </div>
  )
}
