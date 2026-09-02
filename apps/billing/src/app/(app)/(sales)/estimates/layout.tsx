import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requireBillingFeature } from '@/lib/auth/billing-context'
import { EstimatesListData } from './_components/estimates-list-data'
import { EstimatesSection } from './_components/estimates-section'

export default async function EstimatesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('estimates')

  return (
    <EstimatesSection
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={[
                  { label: 'Estimate', cell: 'avatar' },
                  { label: 'Customer' },
                  { label: 'Amount' },
                  { label: 'Status', cell: 'badge' },
                ]}
                rows={5}
              />
            </div>
          }
        >
          <EstimatesListData />
        </Suspense>
      }
    >
      {children}
    </EstimatesSection>
  )
}
