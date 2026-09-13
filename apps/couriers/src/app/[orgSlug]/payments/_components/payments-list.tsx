'use client'

import type { ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Badge } from '@876/ui/badge'
import { PaymentsTable, type PaymentRow } from '@876/billing-ui/payments-table'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@876/ui/empty'
import { CreditCardIcon } from '@876/ui/icons'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneItem,
} from '@876/ui/list-pane'

import { formatDate, formatMoney } from '@/lib/finance/format'

import { resolvePaymentStatus } from '../_lib/payments-list-config'

type Props = {
  payments: PaymentRow[]
  orgSlug: string
}

/**
 * The list column: the full table while no payment is open, and a condensed
 * pane once one opens beside it. Both forms live in one component so the column
 * stays one element across open and close. Binds Couriers' money and date
 * policy and routes to the shared payments table.
 */
export function PaymentsList({ payments, orgSlug }: Props) {
  const segments = useDetailSegments()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const selectedId = segments[0] === 'new' ? null : (segments[0] ?? null)

  // The Billing integration payments list accepts no status parameter, so the
  // status filter narrows the rows here. It is applied in this component
  // rather than the query because the list lives in the layout, which receives
  // no `searchParams`.
  const { selected, filter } = resolvePaymentStatus(
    searchParams.get('status') ?? undefined
  )
  const rows = filter
    ? payments.filter((payment) =>
        filter.some((status) => status === payment.status)
      )
    : payments

  const emptyState: ReactNode = (
    <Empty className="border-0 py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CreditCardIcon />
        </EmptyMedia>
        <EmptyTitle>No payments</EmptyTitle>
        <EmptyDescription>
          {selected === 'all' ? 'No payments yet.' : `No ${selected} payments.`}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )

  if (segments.length === 0)
    return (
      <PaymentsTable
        payments={rows}
        baseHref={`/${orgSlug}/payments`}
        formatAmount={formatMoney}
        formatDate={formatDate}
        emptyState={emptyState}
      />
    )

  const baseHref = `/${orgSlug}/payments`

  return (
    <ListPane>
      <ListPaneBody>
        {rows.length === 0 ? (
          <ListPaneEmpty>No payments</ListPaneEmpty>
        ) : (
          rows.map((payment) => (
            <ListPaneItem
              key={payment.id}
              href={
                query
                  ? `${baseHref}/${payment.id}?${query}`
                  : `${baseHref}/${payment.id}`
              }
              selected={payment.id === selectedId}
              label={`View payment ${payment.number}`}
              title={
                <span className="text-sky-600 dark:text-sky-400">
                  {payment.number}
                </span>
              }
              subtitle={payment.customerName}
              trailing={<Badge variant="secondary">{payment.status}</Badge>}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
