import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requireBillingFeature } from '@/lib/auth/billing-context'
import { VendorsListData } from './_components/vendors-list-data'
import { VendorsSection } from './_components/vendors-section'

export default async function VendorsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('vendors')

  return (
    <VendorsSection
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={[
                  { label: 'Vendor', cell: 'avatar' },
                  { label: 'Reference' },
                  { label: 'Currency' },
                  { label: 'Status', cell: 'badge' },
                ]}
                rows={5}
              />
            </div>
          }
        >
          <VendorsListData />
        </Suspense>
      }
    >
      {children}
    </VendorsSection>
  )
}
