import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requirePagePermission } from '@/lib/auth/billing-context'
import { AddonsSection } from './_components/addons-section'
import { AddonsListData } from './_components/addons-list-data'
import { CATALOG_LISTS } from '../_components/catalog-list-config'

export default async function AddonsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('catalog:read')

  return (
    <AddonsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={CATALOG_LISTS.addons.columns}
              rows={5}
            />
          }
        >
          <AddonsListData />
        </Suspense>
      }
    >
      {children}
    </AddonsSection>
  )
}
