import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { UserSearchBar } from '../_components/user-search-bar'
import { UsersListData } from '../_components/users-list-data'
import { USERS_SKELETON_COLUMNS } from '../_components/users-skeleton-columns'

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

/**
 * The list column for every route under `/users`.
 *
 * This is the slot's only page. On a soft navigation to a record Next keeps a
 * slot's active page when nothing in it matches the new URL, so the list stays
 * mounted: no remount, refetch, or skeleton while the detail card animates in.
 * A catch-all page here would be a different segment per record and remount
 * the list on every open. Filters and search navigate back to `/users`, which
 * re-renders this page with fresh `searchParams`.
 */
export default async function UsersListSlot({ searchParams }: Props) {
  const params = await searchParams

  return (
    <>
      <div className="mb-4 max-w-sm @3xl/list-detail:px-4">
        <Suspense>
          <UserSearchBar />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <DataTableSkeleton columns={USERS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <UsersListData {...params} />
      </Suspense>
    </>
  )
}
