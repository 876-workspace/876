import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ROLES_SKELETON_COLUMNS } from '../_components/roles-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <DataTableSkeleton columns={ROLES_SKELETON_COLUMNS} />
    </Page>
  )
}
