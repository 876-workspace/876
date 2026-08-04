import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { AUDIT_LOG_SKELETON_COLUMNS } from './_components/audit-log-skeleton-columns'
import { AuditLogFilters } from './_components/audit-log-filters'

export default function Loading() {
  return (
    <Page>
      <ResourceToolbar title="Audit Log" refresh />
      <AuditLogFilters filters={{}} />
      <DataTableSkeleton columns={AUDIT_LOG_SKELETON_COLUMNS} />
    </Page>
  )
}
