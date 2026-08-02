import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { PageBreadcrumb } from '@876/ui/page'
import { SUBSCRIPTIONS_SKELETON_COLUMNS } from './_components/subscriptions-skeleton-columns'

export default function Loading() {
  return (
    <div className="space-y-5">
      <div>
        <PageBreadcrumb href="/orgs" label="Billing" className="mb-2" />
        <h1 className="876-page-title mt-2">Subscriptions</h1>
      </div>
      <DataTableSkeleton columns={SUBSCRIPTIONS_SKELETON_COLUMNS} />
    </div>
  )
}
