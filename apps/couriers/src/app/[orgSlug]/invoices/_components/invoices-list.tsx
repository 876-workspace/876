'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { InvoicesTable, type InvoiceRow } from '@876/billing-ui/invoices-table'
import { documentStatusVariant } from '@876/billing-ui/document-status'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { DocumentTextIcon } from '@876/ui/icons'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import { formatMoney } from '@/lib/finance/format'

import { resolveInvoiceStatus } from '../_lib/invoices-list-config'

type Props = {
  invoices: InvoiceRow[]
  orgSlug: string
}

function invoiceCustomerName(customer: InvoiceRow['customer']): string {
  if (typeof customer === 'string') return customer
  return customer?.name ?? '—'
}

/**
 * The list column: the full table while no invoice is open, and a condensed
 * pane once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close. Binds Couriers' money policy and
 * routes to the shared invoices table.
 */
export function InvoicesList({ invoices, orgSlug }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)

  // The list lives in the layout, which receives no `searchParams`, so the
  // status filter is applied here on the client, where it stays current
  // across navigations. The data half loads every invoice.
  const { selected, filter } = resolveInvoiceStatus(
    searchParams.get('status') ?? undefined
  )
  const rows = filter
    ? invoices.filter((invoice) => invoice.status === filter)
    : invoices

  const emptyState: ReactNode = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <DocumentTextIcon />
        </EmptyMedia>
        <EmptyTitle>No invoices</EmptyTitle>
        <EmptyDescription>
          {selected === 'all' ? 'No invoices yet.' : `No ${selected} invoices.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  if (segments.length === 0)
    return (
      <InvoicesTable
        invoices={rows}
        baseHref={`/${orgSlug}/invoices`}
        formatAmount={formatMoney}
        emptyState={emptyState}
      />
    )

  const baseHref = `/${orgSlug}/invoices`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No invoices</ListPaneEmpty>
        ) : (
          rows.map((invoice) => (
            <ListPaneItem
              key={invoice.id}
              href={
                query
                  ? `${baseHref}/${invoice.id}?${query}`
                  : `${baseHref}/${invoice.id}`
              }
              selected={invoice.id === selectedId}
              label={`View invoice ${invoice.number}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {invoice.number}
                </span>
              }
              subtitle={invoiceCustomerName(invoice.customer)}
              trailing={
                <Badge variant={documentStatusVariant(invoice.status)}>
                  {invoice.status}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
