import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { APPS_SKELETON_COLUMNS } from './_components/apps-skeleton-columns'
import { AppsToolbar } from './_components/apps-toolbar'

export default function Loading() {
  return (
    <Page>
      <AppsToolbar status="all" />
      <DataTableSkeleton columns={APPS_SKELETON_COLUMNS} />
    </Page>
  )
}
