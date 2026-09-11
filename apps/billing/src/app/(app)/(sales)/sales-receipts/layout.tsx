import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { SalesReceiptsListData } from './_components/sales-receipts-list-data'
import { SalesReceiptsSection } from './_components/sales-receipts-section'

export default function SalesReceiptsLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SalesReceiptsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={[
                { label: 'Sales Receipt', cell: 'avatar' },
                { label: 'Customer' },
                { label: 'Amount' },
                { label: 'Date' },
                { label: 'Status', cell: 'badge' },
              ]}
              rows={5}
            />
          }
        >
          <SalesReceiptsListData />
        </Suspense>
      }
    >
      {children}
    </SalesReceiptsSection>
  )
}
