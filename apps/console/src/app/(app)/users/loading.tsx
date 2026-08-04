import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { USERS_SKELETON_COLUMNS } from './_components/users-skeleton-columns'
import { UsersToolbar } from './_components/users-toolbar'

export default function Loading() {
  return (
    <Page>
      <UsersToolbar status="all" />
      <DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />
    </Page>
  )
}
