import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requireBillingFeature } from '@/lib/auth/billing-context'
import { InvoicesListData } from './_components/invoices-list-data'
import { InvoicesSection } from './_components/invoices-section'

export default async function InvoicesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('invoices')

  return (
    <InvoicesSection
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={[
                { label: 'Invoice', cell: 'avatar' },
                { label: 'Customer' },
                { label: 'Amount' },
                { label: 'Status', cell: 'badge' },
              ]}
              rows={5}
            />
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
