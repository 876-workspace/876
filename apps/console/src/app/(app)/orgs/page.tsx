import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { isOrgStatus } from '@/lib/status'
import { OrgSearchBar } from './_components/org-search-bar'
import { OrgsListData } from './_components/orgs-list-data'
import { ORGS_SKELETON_COLUMNS } from './_components/orgs-skeleton-columns'
import { OrgsToolbar } from './_components/orgs-toolbar'

type Props = {
  searchParams: Promise<{
    after?: string
    before?: string
    q?: string
    status?: string
  }>
}

export const metadata = { title: 'Organizations' }

export default async function OrganizationsPage({ searchParams }: Props) {
  const params = await searchParams
  const selectedStatus =
    params.status === 'all' || !isOrgStatus(params.status)
      ? 'all'
      : params.status

  return (
    <Page>
      <OrgsToolbar status={selectedStatus} />
      <div className="mb-4 w-full max-w-sm">
        <Suspense>
          <OrgSearchBar />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} rows={5} />
        }
      >
        <OrgsListData {...params} status={selectedStatus} />
      </Suspense>
    </Page>
  )
}
