import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { QuotesListData } from './_components/quotes-list-data'
import { QuotesSection } from './_components/quotes-section'

const QUOTES_SKELETON_COLUMNS = [
  { label: 'Quote', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Amount' },
  { label: 'Status', cell: 'badge' as const },
]

export default function QuotesLayout({ children }: { children: ReactNode }) {
  return (
    <QuotesSection
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={QUOTES_SKELETON_COLUMNS} rows={5} />
            </div>
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
