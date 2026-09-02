import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requireBillingFeature } from '@/lib/auth/billing-context'
import { QuotesListData } from './_components/quotes-list-data'
import { QuotesSection } from './_components/quotes-section'

export default async function QuotesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('quotes')

  return (
    <QuotesSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={[
                { label: 'Quote', cell: 'avatar' },
                { label: 'Customer' },
                { label: 'Amount' },
                { label: 'Status', cell: 'badge' },
              ]}
              rows={5}
            />
          }
        >
          <QuotesListData />
        </Suspense>
      }
    >
      {children}
    </QuotesSection>
  )
}
