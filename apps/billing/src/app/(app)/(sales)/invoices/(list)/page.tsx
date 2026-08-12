import { CreditCardIcon } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { InvoicesTable } from '@/features/documents/components/invoices-table'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import { service } from '@/lib/service'
import type { InvoiceStatus } from '@/types/invoice'

export const metadata = {
  title: 'Invoices',
  description: 'Commercial invoice drafts.',
}

const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Invoices' },
  { value: 'overdue', label: 'Overdue', headingLabel: 'Overdue Invoices' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Invoices' },
  { value: 'void', label: 'Void', headingLabel: 'Void Invoices' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function InvoicesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['draft', 'sent', 'overdue', 'paid', 'void'].includes(
    status ?? ''
  )
    ? status!
    : 'all'

  return (
    <Page>
      <StreamingResourceToolbar
        title="Invoices"
        status={selectedStatus}
        options={INVOICE_STATUS_OPTIONS}
        primary={{
          label: 'New Invoice',
          href: '/invoices/new',
          permission: 'sales:write',
        }}
      />
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
        <InvoicesTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function InvoicesTableData({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['draft', 'sent', 'overdue', 'paid', 'void'].includes(
    status ?? ''
  )
    ? status!
    : 'all'
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as InvoiceStatus)

  const context = await getWorkspaceContext()
  if (!context) return null

  const invoices = await service.invoices.list(context.tenant.id, filterStatus)

  return (
    <InvoicesTable
      invoices={invoices}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CreditCardIcon />
            </EmptyMedia>
            <EmptyTitle>No invoices yet</EmptyTitle>
            <EmptyDescription>
              Create a draft invoice from a customer and item. It will not send
              or collect payment automatically.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
