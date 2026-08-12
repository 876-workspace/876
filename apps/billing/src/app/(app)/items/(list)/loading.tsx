'use client'

import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'

import { ItemsToolbar } from '../_components/items-toolbar'
import { ITEMS_SKELETON_COLUMNS } from '../_components/items-skeleton-columns'

export default function Loading() {
  return (
    <Page>
      <ItemsToolbar status="all" />
      <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} rows={5} />
    </Page>
  )
}
