import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { ItemsListData } from './_components/items-list-data'
import { ItemsSection } from './_components/items-section'

const ITEMS_SKELETON_COLUMNS = [
  { label: 'Item', cell: 'avatar' as const },
  { label: 'Default price' },
  { label: 'Tax' },
  { label: 'Status', cell: 'badge' as const },
]

/**
 * Owns the toolbar and the item list for every route under `/items`.
 *
 * Keeping them here — rather than in each page — is what lets an item open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default function ItemsLayout({ children }: { children: ReactNode }) {
  return (
    <ItemsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={ITEMS_SKELETON_COLUMNS} rows={5} />
          }
        >
          <ItemsListData />
        </Suspense>
      }
    >
      {children}
    </ItemsSection>
  )
}
