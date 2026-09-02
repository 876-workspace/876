import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { CATALOG_LISTS } from '../_components/catalog-list-config'
import { PriceListsListData } from './_components/price-lists-list-data'
import { PriceListsSection } from './_components/price-lists-section'

/**
 * Owns the toolbar and the price-list column for every route under
 * `/price-lists`.
 *
 * Keeping them here — rather than in each page — is what lets a price list
 * open beside the list instead of replacing it, and what keeps the list column
 * a single element across open and close so its width can animate.
 */
export default function PriceListsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <PriceListsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={CATALOG_LISTS.priceLists.columns}
              rows={5}
            />
          }
        >
          <PriceListsListData />
        </Suspense>
      }
    >
      {children}
    </PriceListsSection>
  )
}
