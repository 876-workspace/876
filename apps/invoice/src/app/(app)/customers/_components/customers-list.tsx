'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'

import { CustomersTable, type CustomerRow } from './customers-table'

/**
 * The list column for every `/customers` route: the full table on its own, and
 * a condensed pane once a customer opens beside it.
 *
 * Both forms live here rather than in two components so the column is one
 * element across open and close — that is what lets the shell animate its
 * width instead of remounting a different tree.
 */
export function CustomersList({
  customers,
  emptyState,
}: {
  customers: CustomerRow[]
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
    status === 'active' || status === 'archived'
      ? customers.filter((row) => row.status === status.toUpperCase())
      : customers

  if (!selectedId)
    return <CustomersTable customers={rows} emptyState={emptyState} />

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
                  ? `/customers/${customer.id}?${query}`
                  : `/customers/${customer.id}`
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
