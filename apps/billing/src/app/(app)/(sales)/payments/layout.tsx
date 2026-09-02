import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { PaymentsListData } from './_components/payments-list-data'
import { PaymentsSection } from './_components/payments-section'

const PAYMENTS_SKELETON_COLUMNS = [
  { label: 'Payment', cell: 'avatar' as const },
  { label: 'Deposit account' },
  { label: 'Amount' },
]

/**
 * Owns the toolbar and the payment list for every route under `/payments`.
 *
 * Keeping them here — rather than in each page — is what lets a payment open
 * beside the list instead of replacing it, and what keeps the list column a
 * single element across open and close so its width can animate.
 */
export default function PaymentsLayout({ children }: { children: ReactNode }) {
  return (
    <PaymentsSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton columns={PAYMENTS_SKELETON_COLUMNS} rows={5} />
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
