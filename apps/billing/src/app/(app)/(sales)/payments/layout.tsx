import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { BillingResourceListShell } from '@/components/patterns/billing-resource-list-shell'
import { requirePagePermission } from '@/lib/auth/billing-context'

import { PaymentsListData } from './_components/payments-list-data'

const PAYMENT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Payments' },
]

export default async function PaymentsLayout({
  children,
}: {
  children: ReactNode
}) {
  await requirePagePermission('payments:read')

  return (
    <BillingResourceListShell
      title="Payments Received"
      options={PAYMENT_STATUS_OPTIONS}
      primary={{ label: 'New', href: '/payments/new', permission: 'payments:write' }}
      list={
        <Suspense
          fallback={
            <DataTableSkeleton
              columns={[
                { label: 'Payment', cell: 'avatar' },
                { label: 'Deposit account' },
                { label: 'Amount' },
              ]}
              rows={5}
            />
          }
        >
          <PaymentsListData />
        </Suspense>
      }
    >
      {children}
    </BillingResourceListShell>
  )
}
