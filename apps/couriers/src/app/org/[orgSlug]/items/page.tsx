import { Suspense } from 'react'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { ItemsTableData } from './_components/items-table-data'
import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'
import {
  ITEM_STATUS_OPTIONS,
  ITEMS_DROPDOWN_ACTIONS,
} from './_lib/items-list-config'

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function ItemsPage({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const selectedStatus =
    status === 'active' || status === 'inactive' ? status : 'all'

  return (
    <Page>
      <ResourceToolbar
        title="Items"
        titleFilter={
          <StatusFilterHeading
            label="Items"
            value={selectedStatus}
            options={ITEM_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/items/new`}
        primaryVariant="info"
        refresh
        dropdownActions={ITEMS_DROPDOWN_ACTIONS}
      />
      <Suspense
        fallback={<DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} />}
      >
        <ItemsTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}
