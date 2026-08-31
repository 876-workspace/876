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

type Props = { searchParams: Promise<{ status?: string }> }

export default async function SalesReceiptsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = ['draft', 'sent', 'paid', 'void'].includes(
    status ?? ''
  )
    ? status!
    : 'all'
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
        <SalesReceiptsTableData />
      </Suspense>
    </Page>
  )
}

async function SalesReceiptsTableData() {
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const billing = await getBilling(context.orgId)
  // Sales Receipts share the invoice family — reuse invoices endpoint until dedicated resource exists.
  const result = (await billing.invoices
    .list()
    .catch(
      () => ({ data: null, error: { code: 'unreachable' } }) as const
    )) as unknown as { data: { data: unknown[] } | null; error: unknown | null }
  if (result.error || !result.data || result.data.data.length === 0) {
    return (
      <SalesReceiptsTable
        receipts={[]}
        emptyState={
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ReceiptText />
              </EmptyMedia>
              <EmptyTitle>No sales receipts yet</EmptyTitle>
              <EmptyDescription>
                Record a cash sale when payment is received at the point of
                sale.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      />
    )
  }
  const receipts = (result.data.data as Record<string, unknown>[])
    .slice(0, 5)
    .map((r) => ({
      id: String(r.id),
      number: String(r.number ?? r.id),
      customer: {
        name: String(
          (r.customer as Record<string, unknown>)?.name ?? r.customerName ?? '—'
        ),
      },
      totalAmount: (r.totalAmount as string) ?? '0',
      currency: String(r.currency ?? 'JMD'),
      status: String(r.status ?? 'PAID'),
      date:
        typeof r.createdAt === 'number'
          ? (r.createdAt as number)
          : typeof r.date === 'number'
            ? (r.date as number)
            : null,
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
