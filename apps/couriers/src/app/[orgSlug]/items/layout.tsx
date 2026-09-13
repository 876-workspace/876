import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'
import { ItemsListData } from './_components/items-list-data'
import { ItemsSection } from './_components/items-section'

export const metadata = { title: 'Items' }

type Props = {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}

/**
 * Owns the toolbar and the item list for every route under `/items`, so an
 * item opens beside the list instead of replacing it. Awaits `params` only;
 * the list streams behind its own boundary.
 */
export default async function ItemsLayout({ children, params }: Props) {
  const { orgSlug } = await params

  return (
    <ItemsSection
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} rows={5} />
            </div>
          }
        >
          <ItemsListData orgSlug={orgSlug} />
        </Suspense>
      }
    >
      {children}
    </ItemsSection>
  )
}
