import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { ProductsSection } from './_components/products-section'
import { ProductsListData } from './_components/products-list-data'
import { CATALOG_LISTS } from '../_components/catalog-list-config'

export default async function ProductsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('catalog:read')

  return (
    <ProductsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={CATALOG_LISTS.products.columns}
              rows={5}
            />
          }
        >
          <ProductsListData />
        </Suspense>
      }
    >
      {children}
    </ProductsSection>
  )
}
