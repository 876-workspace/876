import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { SalesReceiptsListData } from './_components/sales-receipts-list-data'
import { SalesReceiptsSection } from './_components/sales-receipts-section'

const SALES_RECEIPTS_SKELETON_COLUMNS = [
  { label: 'Sales Receipt', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Amount' },
  { label: 'Date' },
  { label: 'Status', cell: 'badge' as const },
]

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
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={SALES_RECEIPTS_SKELETON_COLUMNS}
                rows={5}
              />
            </div>
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
