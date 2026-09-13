'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import { resolveCustomerStatusFilter } from '../_lib/customers-list-config'
import { CustomersTable, type CustomerTableRow } from './customers-table'

type Props = {
  customers: CustomerTableRow[]
  orgSlug: string
  emptyState?: ReactNode
}

/**
 * The list column: the full table while no customer is open, and a condensed
 * pane once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close.
 */
export function CustomersList({ customers, orgSlug, emptyState }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)

  // The status filter applies to the courier profile. It is applied here
  // rather than in the query because the list lives in the layout, which
  // receives no `searchParams`; the data half already loads every profile.
  const status = resolveCustomerStatusFilter(searchParams.get('status'))
  const rows =
    status === 'all'
      ? customers
      : customers.filter((row) => row.status === status.toUpperCase())

  if (segments.length === 0)
    return (
      <CustomersTable
        customers={rows}
        orgSlug={orgSlug}
        emptyState={emptyState}
      />
    )

  const baseHref = `/${orgSlug}/customers`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No customers</ListPaneEmpty>
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
              label={`View customer ${customer.customerName}`}
              leading={
                <CustomerAvatar
                  name={customer.customerName}
                  className="size-7"
                />
              }
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {customer.customerName}
                </span>
              }
              subtitle={customer.companyName ?? customer.email}
              trailing={
                <Badge
                  variant={
                    customer.status === 'ACTIVE' ? 'success' : 'secondary'
                  }
                >
                  {customer.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                </Badge>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
