import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { SearchInputPlaceholder } from '@876/ui/search-input'
import { USERS_SKELETON_COLUMNS } from './_components/users-skeleton-columns'
import { UsersToolbar } from './_components/users-toolbar'

export default function Loading() {
  return (
    <Page>
      <UsersToolbar status="all" />
      {/* Mirrors the search row in page.tsx. Without it the table sits one row
          higher here than in the resolved page and jumps down on hand-off. */}
      <div className="mb-4 max-w-sm">
        <SearchInputPlaceholder placeholder="Search users by name, email, or username…" />
      </div>
      <DataTableSkeleton columns={USERS_SKELETON_COLUMNS} />
    </Page>
  )
}
