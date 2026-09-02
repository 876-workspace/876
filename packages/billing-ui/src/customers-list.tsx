'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'
import { useDetailSegments } from '@876/ui/list-detail-shell'

import { CustomersTable, type CustomerRow } from './customers-table'

export interface CustomersListProps {
  customers: CustomerRow[]
  /** Row and link destinations are `${baseHref}/${id}`; the host owns routing. */
  baseHref: string
  /** Money formatting is host policy, forwarded to CustomersTable. */
  formatAmount: (amount: bigint | string | null, currency: string) => string
  emptyState?: ReactNode
}

/**
 * The list column for customer routes: the full table on its own, and
 * a condensed pane once a customer opens beside it.
 *
 * Both forms live here rather than in two components so the column is one
 * element across open and close — that is what lets the shell animate its
 * width instead of remounting a different tree.
 */
export function CustomersList({
  customers,
  baseHref,
  formatAmount,
  emptyState,
}: CustomersListProps) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // The status filter is applied here rather than in the query because a
  // layout receives no `searchParams`, and the list has to live in the layout
  // to survive opening a record. The underlying call already returns the
  // tenant's whole customer set, so this narrows what was fetched either way.
  const status = searchParams.get('status')
  const rows =
    status === 'active' || status === 'archived'
      ? customers.filter((row) => row.status === status.toUpperCase())
      : customers

  if (!selectedId)
    return (
      <CustomersTable
        customers={rows}
        baseHref={baseHref}
        formatAmount={formatAmount}
        emptyState={emptyState}
      />
    )

  return (
    <ListPane>
      <ListPaneHeader>Customers</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No customers yet</ListPaneEmpty>
        ) : (
          rows.map((customer) => (
            <ListPaneItem
              key={customer.id}
              href={
                query
                  ? `${baseHref}/${customer.id}?${query}`
                  : `${baseHref}/${customer.id}`
              }
              selected={customer.id === selectedId}
              label={`View customer ${customer.name}`}
              leading={
                <CustomerAvatar name={customer.name} className="size-7" />
              }
              title={customer.name}
              subtitle={customer.companyName ?? customer.contactName ?? '—'}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
