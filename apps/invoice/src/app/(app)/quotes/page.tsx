import type { QuoteStatus } from '@876/billing'
import { ClipboardList } from '@876/ui/icons'
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
import { QuotesTable } from './_components/quotes-table'

export const metadata = {
  title: 'Quotes',
  description: 'Sales proposals and their line snapshots.',
}

const QUOTE_STATUS_OPTIONS: StatusFilterOption[] = [
  { value: 'all', label: 'All', headingLabel: 'All Quotes' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Quotes' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Quotes' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Quotes' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Quotes' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Quotes' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Quotes' },
]

type QuoteStatusFilter =
  | 'all'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'canceled'

type Props = { searchParams: Promise<{ status?: string }> }

function getStatusFilter(status?: string): QuoteStatusFilter {
  switch (status) {
    case 'draft':
    case 'sent':
    case 'accepted':
    case 'declined':
    case 'expired':
    case 'canceled':
      return status
    default:
      return 'all'
  }
}

function getApiStatus(status: QuoteStatusFilter): QuoteStatus | undefined {
  switch (status) {
    case 'draft':
      return 'DRAFT'
    case 'sent':
      return 'SENT'
    case 'accepted':
      return 'ACCEPTED'
    case 'declined':
      return 'DECLINED'
    case 'expired':
      return 'EXPIRED'
    case 'canceled':
      return 'CANCELED'
    case 'all':
      return undefined
  }
}

export default async function QuotesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = getStatusFilter(status)

  return (
    <Page>
      <ResourceToolbar
        title="Quotes"
        titleFilter={
          <StatusFilterHeading
            label="Quotes"
            value={selectedStatus}
            options={QUOTE_STATUS_OPTIONS}
          />
        }
        primaryLabel="New"
        primaryHref="/quotes/new"
        primaryVariant="info"
        refresh
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Quote', cell: 'avatar' as const },
              { label: 'Customer' },
              { label: 'Amount' },
              { label: 'Status', cell: 'badge' as const },
            ]}
            rows={5}
          />
        }
      >
        <QuotesTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}

async function QuotesTableData({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = getStatusFilter(status)
  const apiStatus = getApiStatus(selectedStatus)
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')

  const billing = await getBilling(context.orgId)
  const result = await billing.quotes.list(
    apiStatus ? { status: apiStatus } : undefined
  )

  if (result.error) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">Quotes are unavailable right now</p>
        <p className="text-muted-foreground mt-1 text-sm">
          {result.error.message}
        </p>
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          {result.error.code}
        </p>
      </div>
    )
  }

  const quotes = result.data.data.map((quote) => ({
    id: quote.id,
    number: quote.number,
    totalAmount: quote.totalAmount,
    currency: quote.currency,
    status: quote.status,
    customer: { name: quote.customer.name },
    convertedInvoice: quote.convertedInvoice
      ? { number: quote.convertedInvoice.number }
      : null,
  }))

  return (
    <QuotesTable
      quotes={quotes}
      emptyState={
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No quotes yet</EmptyTitle>
            <EmptyDescription>
              Create a customer and item, then prepare the first draft quote.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  )
}
