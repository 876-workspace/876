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

import { InvoicesTable } from '@/features/documents/components/invoices-table'
import type { ComponentProps } from 'react'
import { documentStatusVariant } from '@/lib/status'

type InvoiceRow = ComponentProps<typeof InvoicesTable>['invoices'][number]

type Props = {
  invoices: InvoiceRow[]
  emptyState?: ReactNode
}

export function InvoicesList({ invoices, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  const status = searchParams.get('status') ?? 'all'
  const selectedStatus = ['draft', 'sent', 'overdue', 'paid', 'void'].includes(
    status
  )
    ? status
    : 'all'

  const rows =
    selectedStatus === 'all'
      ? invoices
      : invoices.filter((row) => row.status.toLowerCase() === selectedStatus)

  if (!selectedId)
    return <InvoicesTable invoices={rows} emptyState={emptyState} />

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
              subtitle={invoice.customer.name}
              trailing={
                <Badge variant={documentStatusVariant(invoice.status)}>
                  <span className="capitalize">
                    {invoice.status.toLowerCase()}
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
