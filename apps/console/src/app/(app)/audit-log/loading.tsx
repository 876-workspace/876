import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { Skeleton } from '@876/ui/skeleton'
import { AUDIT_LOG_SKELETON_COLUMNS } from './_components/audit-log-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <ResourceToolbar title="Audit Log" refresh />
      <Skeleton className="mb-4 h-10 w-full" />
      <DataTableSkeleton columns={AUDIT_LOG_SKELETON_COLUMNS} />
    </Page>
  )
}
