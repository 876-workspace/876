import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { ITEMS_SKELETON_COLUMNS } from './_components/items-skeleton-columns'
import { ItemsListData } from './_components/items-list-data'
import { ItemsSection } from './_components/items-section'

export default async function ItemsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('catalog:read')

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
