import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { CouponsSection } from './_components/coupons-section'
import { CouponsListData } from './_components/coupons-list-data'
import { CATALOG_LISTS } from '../_components/catalog-list-config'

export default async function CouponsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('catalog:read')

  return (
    <CouponsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={CATALOG_LISTS.coupons.columns}
              rows={5}
            />
          }
        >
          <CouponsListData />
        </Suspense>
      }
    >
      {children}
    </CouponsSection>
  )
}
