import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { requireBillingFeature } from '@/lib/auth/billing-context'
import { RECURRING_INVOICES_SKELETON_COLUMNS } from './_components/recurring-invoices-skeleton-columns'
import { RecurringInvoicesListData } from './_components/recurring-invoices-list-data'
import { RecurringInvoicesSection } from './_components/recurring-invoices-section'

/**
 * Owns the toolbar and the recurring-invoice list for every route under
 * `/recurring-invoices`, so a profile opens beside the list instead of
 * replacing it. The invoices capability gates this section: profiles share
 * the invoices permission and module, with no new keys.
 */
export default async function RecurringInvoicesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('invoices')

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
