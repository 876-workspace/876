import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { APPS_SKELETON_COLUMNS } from '../_components/apps-skeleton-columns'
import { AppsToolbar } from '../_components/apps-toolbar'
import { resolveStatusFilter } from '../_lib/app-status-filter'

export default function Loading() {
  return (
    <Page>
      {/* `resolveStatusFilter` defaults to `active`, not `all` — hardcoding
          "all" here made the heading and the checked dropdown option flash the
          wrong filter before the page arrived. */}
      <AppsToolbar status={resolveStatusFilter(undefined)} />
      <DataTableSkeleton
        columns={APPS_SKELETON_COLUMNS}
        className="-mx-4 rounded-none border-x-0 sm:-mx-6 lg:-mx-8"
      />
    </Page>
  )
}
