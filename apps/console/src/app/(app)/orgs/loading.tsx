import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ORGS_SKELETON_COLUMNS } from './_components/orgs-skeleton-columns'
import { OrgsToolbar } from './_components/orgs-toolbar'

export default function Loading() {
  return (
    <Page>
      <OrgsToolbar status="all" />
      <DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} />
    </Page>
  )
}
