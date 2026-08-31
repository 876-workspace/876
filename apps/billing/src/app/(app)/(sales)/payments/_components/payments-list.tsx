'use client'

import Link from 'next/link'
import { ResourceSplitList } from '@876/ui/resource-split-list'

import { formatDate, formatMoney } from '@/lib/format'

export type PaymentListRow = {
  id: string
  number: string
  customerName: string
  paymentDate: number | null
  paymentModeName: string
  depositAccountName: string
  amount: string
  allocated: string
  currency: string
  status: string
}

export function PaymentsList({ payments }: { payments: PaymentListRow[] }) {
  const list = (
    <div className="876-card overflow-hidden">
      <div className="divide-border divide-y">
        {payments.map((payment) => (
          <Link
            key={payment.id}
            href={`/payments/${payment.id}`}
            className="hover:bg-muted/30 grid gap-3 px-5 py-4 transition-colors sm:grid-cols-[1fr_1fr_auto] sm:items-center"
          >
            <div>
              <p className="font-medium">{payment.number}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {payment.customerName} · {formatDate(payment.paymentDate)}
              </p>
            </div>
            <div className="text-sm">
              <p>{payment.paymentModeName}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Deposited to {payment.depositAccountName}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="font-semibold tabular-nums">
                {formatMoney(payment.amount, payment.currency)}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {formatMoney(payment.allocated, payment.currency)} allocated
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )

  return (
    <ResourceSplitList
      table={list}
      items={payments.map((payment) => ({
        id: payment.id,
        href: `/payments/${payment.id}`,
        title: payment.number,
        description: payment.customerName,
        meta: `${formatMoney(payment.amount, payment.currency)} · ${formatDate(payment.paymentDate)}`,
      }))}
    />
  )
}
