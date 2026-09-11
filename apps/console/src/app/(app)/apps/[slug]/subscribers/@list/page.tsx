import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { SubscribersListData } from '../_components/subscribers-list-data'
import { SUBSCRIBERS_SKELETON_COLUMNS } from '../_components/subscribers-skeleton-columns'

type Props = { params: Promise<{ slug: string }> }

/**
 * The list column for every route under `/apps/[slug]/subscribers`.
 *
 * This is the slot's only page. On a soft navigation to a record Next keeps a
 * slot's active page when nothing in it matches the new URL, so the list stays
 * mounted: no remount, refetch, or skeleton while the detail card animates in.
 * A catch-all page here would be a different segment per record and remount
 * the list on every open. Filters and search navigate back to `/apps/[slug]/subscribers`, which
 * re-renders this page with fresh `searchParams`.
 */
export default async function SubscribersListSlot({ params }: Props) {
  const { slug } = await params

  return (
    <Suspense
      fallback={
        <DataTableSkeleton columns={SUBSCRIBERS_SKELETON_COLUMNS} rows={5} />
      }
    >
      <SubscribersListData slug={slug} />
    </Suspense>
  )
}
