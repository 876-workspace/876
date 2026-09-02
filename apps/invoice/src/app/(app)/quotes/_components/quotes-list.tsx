'use client'

import type { ComponentProps, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'

import { documentStatusVariant } from '@/lib/status'
import { QuotesTable } from './quotes-table'

type QuoteRow = ComponentProps<typeof QuotesTable>['quotes'][number]

export function QuotesList({
  quotes,
  emptyState,
}: {
  quotes: QuoteRow[]
  emptyState?: ReactNode
}) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record.
  const status = searchParams.get('status')
  const rows =
    status === 'draft' ||
    status === 'sent' ||
    status === 'accepted' ||
    status === 'declined' ||
    status === 'expired' ||
    status === 'canceled'
      ? quotes.filter((quote) => quote.status.toLowerCase() === status)
      : quotes

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
                    {quote.status.toLowerCase().replace(/_/g, ' ')}
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
