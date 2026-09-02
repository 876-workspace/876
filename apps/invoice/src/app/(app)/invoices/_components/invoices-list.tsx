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
import { InvoicesTable } from '@876/billing-ui/invoices-table'

import { formatMoney } from '@/lib/format'

type InvoiceRow = ComponentProps<typeof InvoicesTable>['invoices'][number]

function customerName(customer: InvoiceRow['customer']) {
  if (typeof customer === 'string') return customer
  return customer?.name ?? '—'
}

export function InvoicesList({
  invoices,
  emptyState,
}: {
  invoices: InvoiceRow[]
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
    status === 'overdue' ||
    status === 'paid' ||
    status === 'void'
      ? invoices.filter((invoice) => invoice.status.toLowerCase() === status)
      : invoices

  if (!selectedId)
    return (
      <InvoicesTable
        invoices={rows}
        baseHref="/invoices"
        formatAmount={formatMoney}
        emptyState={emptyState}
      />
    )

  return (
    <ListPane>
      <ListPaneHeader>Invoices</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No invoices yet</ListPaneEmpty>
        ) : (
          rows.map((invoice) => (
            <ListPaneItem
              key={invoice.id}
              href={
                query
                  ? `/invoices/${invoice.id}?${query}`
                  : `/invoices/${invoice.id}`
              }
              selected={invoice.id === selectedId}
              label={`View invoice ${invoice.number}`}
              title={invoice.number}
              subtitle={customerName(invoice.customer)}
              trailing={
                <Badge variant={documentStatusVariant(invoice.status)}>
                  <span className="capitalize">
                    {invoice.status.toLowerCase().replace(/_/g, ' ')}
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
