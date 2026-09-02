import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { PlansSection } from './_components/plans-section'
import { PlansListData } from './_components/plans-list-data'
import { CATALOG_LISTS } from '../_components/catalog-list-config'

export default async function PlansLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('catalog:read')

  return (
    <PlansSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={CATALOG_LISTS.plans.columns} rows={5} />
          }
        >
          <PlansListData />
        </Suspense>
      }
    >
      {children}
    </PlansSection>
  )
}
