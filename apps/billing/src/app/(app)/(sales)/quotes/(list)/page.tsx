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
import { QuotesTable } from '../_components/quotes-table'
import { DataTableSkeleton } from '@876/ui/data-table-skeleton'

import { getWorkspaceContext } from '@/lib/auth/billing-context'
import { StreamingResourceToolbar } from '@/components/patterns/streaming-resource-toolbar'
import { service } from '@/lib/service'
import type { QuoteStatus } from '@/types/quote'

export const metadata = {
  title: 'Quotes',
  description: 'Sales proposals and their line snapshots.',
}

const QUOTE_STATUS_OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Quotes' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Quotes' },
  { value: 'sent', label: 'Sent', headingLabel: 'Sent Quotes' },
  { value: 'accepted', label: 'Accepted', headingLabel: 'Accepted Quotes' },
  { value: 'declined', label: 'Declined', headingLabel: 'Declined Quotes' },
  { value: 'expired', label: 'Expired', headingLabel: 'Expired Quotes' },
  { value: 'canceled', label: 'Canceled', headingLabel: 'Canceled Quotes' },
]

type Props = {
  searchParams: Promise<{
    status?: string
  }>
}

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
      <StreamingResourceToolbar
        title="Quotes"
        status={selectedStatus}
        options={QUOTE_STATUS_OPTIONS}
        primary={{
          label: 'New',
          href: '/quotes/new',
          permission: 'sales:write',
        }}
      />
      <Suspense
        fallback={
          <DataTableSkeleton
            columns={[
              { label: 'Quote', cell: 'avatar' },
              { label: 'Customer' },
              { label: 'Amount' },
              { label: 'Status', cell: 'badge' },
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
  const filterStatus =
    selectedStatus === 'all'
      ? undefined
      : (selectedStatus.toUpperCase() as QuoteStatus)

  const context = await getWorkspaceContext()
  if (!context) return null

  const quotes = await service.quotes.list(context.tenant.id, filterStatus)

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
