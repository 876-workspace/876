'use client'

import type { ReactNode } from 'react'
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

import { PaymentsTable, type PaymentRow } from '@876/billing-ui/payments-table'

import { formatDate, formatMoney } from '@/lib/format'

export function PaymentsList({
  payments,
  emptyState,
}: {
  payments: PaymentRow[]
  emptyState?: ReactNode
}) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] ?? null

  // Payments expose a single "All" filter option, so there is nothing to
  // narrow here. When a real status filter is added it is applied over these
  // rows on the client, as the other sections do: a layout receives no
  // `searchParams`, and the list has to live in the layout to survive opening
  // a record.
  const rows = payments

  if (!selectedId)
    return (
      <PaymentsTable
        payments={rows}
        baseHref="/payments"
        formatAmount={formatMoney}
        formatDate={formatDate}
        emptyState={emptyState}
      />
    )

  return (
    <ListPane>
      <ListPaneHeader>Payments Received</ListPaneHeader>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No payments received</ListPaneEmpty>
        ) : (
          rows.map((payment) => (
            <ListPaneItem
              key={payment.id}
              href={
                query
                  ? `/payments/${payment.id}?${query}`
                  : `/payments/${payment.id}`
              }
              selected={payment.id === selectedId}
              label={`View payment ${payment.number}`}
              title={payment.number}
              subtitle={payment.customerName}
              trailing={
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                  <Badge variant="secondary">{payment.status}</Badge>
                </span>
              }
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
