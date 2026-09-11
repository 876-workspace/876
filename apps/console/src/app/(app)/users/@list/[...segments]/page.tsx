import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { UserSearchBar } from '../../_components/user-search-bar'
import { UsersListData } from '../../_components/users-list-data'
import { USERS_SKELETON_COLUMNS } from '../../_components/users-skeleton-columns'

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

/**
 * This slot follows every `/users` sub-route, so its list receives fresh query
 * parameters on search/filter/pagination navigation while the detail child
 * stays mounted beside it.
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
