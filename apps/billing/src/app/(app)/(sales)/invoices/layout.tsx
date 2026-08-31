import { Suspense, type ReactNode } from 'react'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import type { StatusFilterOption } from '@876/ui/status-filter-heading'

import { BillingResourceListShell } from '@/components/patterns/billing-resource-list-shell'
import { requireBillingFeature } from '@/lib/auth/billing-context'

import { InvoicesTableData } from './_components/invoices-table-data'

const INVOICE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

const SKELETON_COLUMNS = [
  { label: 'Invoice', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Amount' },
  { label: 'Status', cell: 'badge' as const },
]

export default async function InvoicesLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireBillingFeature('invoices')

  return (
    <BillingResourceListShell
      title="Invoices"
      options={INVOICE_STATUS_OPTIONS}
      primary={{ label: 'New', href: '/invoices/new', permission: 'sales:write' }}
      list={
        <Suspense
          fallback={<DataTableSkeleton columns={SKELETON_COLUMNS} rows={5} />}
        >
          <InvoicesTableData />
        </Suspense>
      }
    >
      {children}
    </BillingResourceListShell>
  )
}
