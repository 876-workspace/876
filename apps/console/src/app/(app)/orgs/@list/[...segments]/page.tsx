import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { OrgSearchBar } from '../../_components/org-search-bar'
import { OrgsListData } from '../../_components/orgs-list-data'
import { ORGS_SKELETON_COLUMNS } from '../../_components/orgs-skeleton-columns'

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

/** Keeps the paginated organization directory query-aware beside every card. */
export default async function OrgsListSlot({ searchParams }: Props) {
  const params = await searchParams

  return (
    <>
      <div className="mb-4 w-full max-w-sm @3xl/list-detail:px-4">
        <Suspense>
          <OrgSearchBar />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <OrgsListData {...params} />
      </Suspense>
    </>
  )
}
