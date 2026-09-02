'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CreditCardIcon } from '@876/ui/icons'
import { useDetailSegments } from '@876/ui/list-detail-shell'
import {
  ListPane,
  ListPaneBody,
  ListPaneEmpty,
  ListPaneHeader,
  ListPaneItem,
} from '@876/ui/list-pane'

export type PaymentRow = {
  id: string
  number: string
  customerName: string
  paymentDate: string
  paymentModeName: string
  depositAccountName: string
  amount: string
  allocated: string
}

/**
 * The list column for every `/payments` route: the full list on its own, and a
 * condensed pane once a payment opens beside it.
 *
 * Both forms live here rather than in two components so the column is one
 * element across open and close — that is what lets the shell animate its
 * width instead of remounting a different tree.
 */
export function PaymentsList({ payments }: { payments: PaymentRow[] }) {
  const segments = useDetailSegments()
  const query = useSearchParams().toString()
  const selectedId = segments[0] ?? null

  const hrefFor = (id: string) =>
    query ? `/payments/${id}?${query}` : `/payments/${id}`

  if (!selectedId) {
    if (payments.length === 0)
      return (
        <div className="876-card px-6 py-14 text-center">
          <CreditCardIcon className="text-muted-foreground mx-auto size-7" />
          <p className="mt-3 font-medium">No payments received</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Record a customer payment and distribute it across one or more open
            invoices.
          </p>
        </div>
      )

    return (
      <div className="876-card overflow-hidden">
        <div className="divide-border divide-y">
          {payments.map((payment) => (
            <Link
              key={payment.id}
              href={hrefFor(payment.id)}
              className="hover:bg-muted/30 grid gap-3 px-5 py-4 transition-colors sm:grid-cols-[1fr_1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-medium">{payment.number}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {payment.customerName} · {payment.paymentDate}
                </p>
              </div>
              <div className="text-sm">
                <p>{payment.paymentModeName}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Deposited to {payment.depositAccountName}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="font-semibold tabular-nums">{payment.amount}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {payment.allocated} allocated
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ListPane>
      <ListPaneHeader>Payments Received</ListPaneHeader>
      <ListPaneBody>
        {payments.length === 0 ? (
          <ListPaneEmpty>No payments received</ListPaneEmpty>
        ) : (
          payments.map((payment) => (
            <ListPaneItem
              key={payment.id}
              href={hrefFor(payment.id)}
              selected={payment.id === selectedId}
              label={`View payment ${payment.number}`}
              title={payment.number}
              subtitle={`${payment.customerName} · ${payment.paymentDate}`}
              trailing={<span className="tabular-nums">{payment.amount}</span>}
            />
          ))
        )}
      </ListPaneBody>
    </ListPane>
  )
}
