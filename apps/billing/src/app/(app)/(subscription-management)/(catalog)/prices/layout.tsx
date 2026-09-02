import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { PricesSection } from './_components/prices-section'
import { PricesListData } from './_components/prices-list-data'
import { CATALOG_LISTS } from '../_components/catalog-list-config'

export default async function PricesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('catalog:read')

  return (
    <PricesSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={CATALOG_LISTS.prices.columns}
              rows={5}
            />
          }
        >
          <PricesListData />
        </Suspense>
      }
    >
      {children}
    </PricesSection>
  )
}
