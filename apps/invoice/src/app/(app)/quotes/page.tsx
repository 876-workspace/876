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

import { get876Client } from '@/lib/876'
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

type Props = { searchParams: Promise<{ status?: string }> }

export default async function QuotesPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = [
    'draft',
    'sent',
    'accepted',
    'declined',
    'expired',
    'canceled',
  ].includes(status ?? '')
    ? status!
    : 'all'
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
  const selectedStatus = [
    'draft',
    'sent',
    'accepted',
    'declined',
    'expired',
    'canceled',
  ].includes(status ?? '')
    ? status!
    : 'all'
  const context = await getInvoiceContext()
  if (!context) redirect('/no-access')
  const $876 = await get876Client(context.orgId)
  const result = (await $876.quotes
    .list()
    .catch(
      () => ({ data: null, error: { code: 'unreachable' } }) as const
    )) as unknown as { data: { data: unknown[] } | null; error: unknown | null }
  if (result.error || !result.data) {
    return (
      <QuotesTable
        quotes={[]}
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
  const quotes = (result.data.data as Record<string, unknown>[]).map((q) => ({
    id: String(q.id),
    number: String(q.number ?? q.id),
    totalAmount: (q.totalAmount as string) ?? (q.amount as string) ?? '0',
    currency: String(q.currency ?? 'JMD'),
    status: String(q.status ?? 'DRAFT'),
    customer: {
      name: String(
        (q.customer as Record<string, unknown>)?.name ?? q.customerName ?? '—'
      ),
    },
    convertedInvoice: (q.convertedInvoice as { number: string } | null) ?? null,
  }))
  void selectedStatus
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
