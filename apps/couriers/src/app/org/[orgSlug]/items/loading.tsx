'use client'

import { useParams } from 'next/navigation'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { Page } from '@876/ui/page'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import { StatusFilterHeading } from '@876/ui/status-filter-heading'

import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'
import {
  ITEM_STATUS_OPTIONS,
  ITEMS_DROPDOWN_ACTIONS,
} from './_lib/items-list-config'

export default function Loading() {
  const { orgSlug } = useParams<{ orgSlug: string }>()

  return (
    <Page>
      <ResourceToolbar
        title="Items"
        titleFilter={
          <StatusFilterHeading
            label="Items"
            value="all"
            options={ITEM_STATUS_OPTIONS}
          />
        }
        primaryLabel="Add"
        primaryHref={`/org/${orgSlug}/items/new`}
        primaryVariant="info"
        refresh
        dropdownActions={ITEMS_DROPDOWN_ACTIONS}
      />
      <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} />
    </Page>
  )
}
