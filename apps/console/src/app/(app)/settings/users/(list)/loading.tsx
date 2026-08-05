import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { TEAM_SKELETON_COLUMNS } from '../_components/team-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <DataTableSkeleton columns={TEAM_SKELETON_COLUMNS} />
    </Page>
  )
}
