import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requireAppPermission } from '@/lib/auth/guards'

import { RECURRING_INVOICES_SKELETON_COLUMNS } from './_components/recurring-invoices-skeleton-columns'
import { RecurringInvoicesListData } from './_components/recurring-invoices-list-data'
import { RecurringInvoicesSection } from './_components/recurring-invoices-section'

export default async function RecurringInvoicesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAppPermission('invoices.view')

  return (
    <RecurringInvoicesSection
      list={
        <Suspense
          fallback={
            <div className="flex h-full min-h-0 flex-col gap-3">
              <DataTableSkeleton
                columns={RECURRING_INVOICES_SKELETON_COLUMNS}
                rows={5}
              />
            </div>
          }
        >
          <RecurringInvoicesListData />
        </Suspense>
      }
    >
      {children}
    </RecurringInvoicesSection>
  )
}
