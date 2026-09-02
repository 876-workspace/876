import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requireBillingFeature } from '@/lib/auth/billing-context'
import { CreditNotesListData } from './_components/credit-notes-list-data'
import { CreditNotesSection } from './_components/credit-notes-section'

const COLUMNS = [
  { label: 'Credit note', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Amount' },
  { label: 'Balance' },
  { label: 'Status', cell: 'badge' as const },
]

export default async function CreditNotesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('invoices')

  return (
    <CreditNotesSection
      list={
        <Suspense fallback={<DataTableSkeleton columns={COLUMNS} rows={5} />}>
          <CreditNotesListData />
        </Suspense>
      }
    >
      {children}
    </CreditNotesSection>
  )
}
