import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PaymentsListData } from './_components/payments-list-data'
import { PaymentsSection } from './_components/payments-section'

const PAYMENTS_SKELETON_COLUMNS = [
  { label: 'Payment', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Deposit account' },
  { label: 'Amount' },
]

export default function PaymentsLayout({ children }: { children: ReactNode }) {
  return (
    <PaymentsSection
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={PAYMENTS_SKELETON_COLUMNS} rows={5} />
            </div>
          }
        >
          <PaymentsListData />
        </Suspense>
      }
    >
      {children}
    </PaymentsSection>
  )
}
