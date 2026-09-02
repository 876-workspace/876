import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { InvoicesListData } from './_components/invoices-list-data'
import { InvoicesSection } from './_components/invoices-section'

const INVOICES_SKELETON_COLUMNS = [
  { label: 'Invoice', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Amount' },
  { label: 'Status', cell: 'badge' as const },
]

export default function InvoicesLayout({ children }: { children: ReactNode }) {
  return (
    <InvoicesSection
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton columns={INVOICES_SKELETON_COLUMNS} rows={5} />
            </div>
          }
        >
          <InvoicesListData />
        </Suspense>
      }
    >
      {children}
    </InvoicesSection>
  )
}
