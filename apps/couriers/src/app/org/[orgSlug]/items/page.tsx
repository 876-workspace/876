import { Suspense } from 'react'
import { Page } from '@876/ui/page'

import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Skeleton } from '@876/ui/skeleton'

import { ItemsTableData } from './_components/items-table-data'
import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'

const ITEM_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Items' },
  { value: 'active', label: 'Active', headingLabel: 'Active Items' },
  { value: 'inactive', label: 'Inactive', headingLabel: 'Inactive Items' },
]

type Props = {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ status?: string }>
}

export default function ItemsPage({ params, searchParams }: Props) {
  return (
    <Page>
      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <ItemsToolbar params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense
        fallback={<DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} />}
      >
        <ItemsTableData params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function ItemsToolbar({ params, searchParams }: Props) {
  const [{ orgSlug }, { status }] = await Promise.all([params, searchParams])
  const selectedStatus =
    status === 'active' || status === 'inactive' ? status : 'all'
  return (
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
      dropdownActions={[
        { label: 'Import', icon: 'import' },
        { label: 'Export', icon: 'export' },
        {
          label: 'Delete items',
          icon: 'delete',
          destructive: true,
          separator: true,
        },
      ]}
    />
  )
}
