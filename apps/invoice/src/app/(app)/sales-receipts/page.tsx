import type { InvoiceStatus } from '@876/billing'
import { ReceiptText } from '@876/ui/icons'
import { Suspense } from 'react'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { Page } from '@876/ui/page'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'
import { ResourceToolbar } from '@876/ui/resource-toolbar'
import {
  StatusFilterHeading,
  type StatusFilterOption,
} from '@876/ui/status-filter-heading'
import { redirect } from 'next/navigation'

import { getBilling } from '@/lib/services/billing'
import { getInvoiceContext } from '@/lib/auth/context'
import { SalesReceiptsTable } from './_components/sales-receipts-table'

export const metadata = {
  title: 'Sales Receipts',
  description: 'Sales receipts and cash sales.',
}

const SALES_RECEIPT_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Sales Receipts' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Sales Receipts' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Sales Receipts' },
  { value: 'paid', label: 'Paid', headingLabel: 'Paid Sales Receipts' },
  { value: 'void', label: 'Void', headingLabel: 'Void Sales Receipts' },
]

type SalesReceiptStatusFilter = 'all' | 'draft' | 'sent' | 'paid' | 'void'
type Props = { searchParams: Promise<{ status?: string }> }

function getStatusFilter(status?: string): SalesReceiptStatusFilter {
  switch (status) {
    case 'draft':
    case 'sent':
    case 'paid':
    case 'void':
      return status
    default:
      return 'all'
  }
}

function getApiStatus(
  status: SalesReceiptStatusFilter
): InvoiceStatus | undefined {
  switch (status) {
    case 'draft':
      return 'DRAFT'
    case 'sent':
      return 'SENT'
    case 'paid':
      return 'PAID'
    case 'void':
      return 'VOID'
    case 'all':
      return undefined
  }
}

export default async function SalesReceiptsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = getStatusFilter(status)

  return (
    <Page>
      <ResourceToolbar
        title="Sales Receipts"
        titleFilter={
          <StatusFilterHeading
            label="Sales Receipts"
            value={selectedStatus}
            options={SALES_RECEIPT_STATUS_OPTIONS}
          />
        }
        primaryLabel="New"
        primaryHref="/sales-receipts/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Sales Receipt', cell: 'avatar' as const },
              { label: 'Customer' },
              { label: 'Amount' },
              { label: 'Date' },
              { label: 'Status', cell: 'badge' as const },
            ]}
            rows={5}
          />
        }
      >
        <SalesReceiptsTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function SalesReceiptsTableData({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = getStatusFilter(status)
  const apiStatus = getApiStatus(selectedStatus)
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  // Sales receipts still share the invoice family until Billing exposes a
  // dedicated receipt discriminator/resource. Keep the source data truthful.
  const result = await billing.invoices.list(
    apiStatus ? { status: apiStatus } : undefined
  )

  if (result.error) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">
          Sales receipts are unavailable right now
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {result.error.message}
        </p>
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          {result.error.code}
        </p>
      </div>
    )
  }

  const receipts = result.data.data.map((receipt) => ({
    id: receipt.id,
    number: receipt.number,
    customer: { name: receipt.customer.name },
    totalAmount: receipt.totalAmount,
    currency: receipt.currency,
    status: receipt.status,
    date: receipt.paidAt,
  }))

  return (
    <SalesReceiptsTable
      receipts={receipts}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ReceiptText />
            </EmptyMedia>
            <EmptyTitle>No sales receipts yet</EmptyTitle>
            <EmptyDescription>
              Record a cash sale when payment is received at the point of sale.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
