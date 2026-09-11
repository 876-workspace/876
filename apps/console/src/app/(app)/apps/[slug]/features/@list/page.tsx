import { Suspense } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { FeaturesListData } from '../_components/features-list-data'
import { FEATURES_SKELETON_COLUMNS } from '../_components/features-skeleton-columns'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string; after?: string; before?: string }>
}

/**
 * The list column for every route under `/apps/[slug]/features`.
 *
 * This is the slot's only page. On a soft navigation to a record Next keeps a
 * slot's active page when nothing in it matches the new URL, so the list stays
 * mounted: no remount, refetch, or skeleton while the detail card animates in.
 * A catch-all page here would be a different segment per record and remount
 * the list on every open. Filters and search navigate back to `/apps/[slug]/features`, which
 * re-renders this page with fresh `searchParams`.
 */
export default async function FeaturesListSlot({
  params,
  searchParams,
}: Props) {
  const { slug } = await params

  return (
    <Suspense
      fallback={<DataTableSkeleton columns={FEATURES_SKELETON_COLUMNS} />}
    >
      <FeaturesListData slug={slug} searchParams={searchParams} />
    </Suspense>
  )
}
