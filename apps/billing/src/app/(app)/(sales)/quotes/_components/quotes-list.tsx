'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import { Badge } from '@876/ui/badge'

import { QuotesTable } from './quotes-table'
import type { ComponentProps } from 'react'
import { documentStatusVariant } from '@/lib/status'

type QuoteRow = ComponentProps<typeof QuotesTable>['quotes'][number]

type Props = {
  quotes: QuoteRow[]
  emptyState?: ReactNode
}

export function QuotesList({ quotes, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = searchParams.get('status') ?? 'all'
  const selectedStatus = [
    'draft',
    'sent',
    'accepted',
    'declined',
    'expired',
    'canceled',
  ].includes(status)
    ? status
    : 'all'

  const rows =
    selectedStatus === 'all'
      ? quotes
      : quotes.filter((row) => row.status.toLowerCase() === selectedStatus)

  if (!selectedId) return <QuotesTable quotes={rows} emptyState={emptyState} />

  return (
    <ListPane>
      <ListPaneHeader>Quotes</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No quotes yet</ListPaneEmpty>
        ) : (
          rows.map((quote) => (
            <ListPaneItem
              key={quote.id}
              href={
                query ? `/quotes/${quote.id}?${query}` : `/quotes/${quote.id}`
              }
              selected={quote.id === selectedId}
              label={`View quote ${quote.number}`}
              title={quote.number}
              subtitle={quote.customer.name}
              trailing={
                <Badge variant={documentStatusVariant(quote.status)}>
                  <span className="capitalize">
                    {quote.status.toLowerCase()}
                  </span>
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
