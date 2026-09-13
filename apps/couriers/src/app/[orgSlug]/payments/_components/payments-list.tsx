'use client'

import type { ReactNode } from 'react'
import { PaymentsTable, type PaymentRow } from '@876/billing-ui/payments-table'

import { formatDate, formatMoney } from '@/lib/finance/format'

type Props = {
  payments: PaymentRow[]
  orgSlug: string
  emptyState?: ReactNode
}

/** Binds Couriers' money and date policy and routes to the shared payments table. */
export function PaymentsList({ payments, orgSlug, emptyState }: Props) {
  return (
    <PaymentsTable
      payments={payments}
      baseHref={`/${orgSlug}/payments`}
      formatAmount={formatMoney}
      formatDate={formatDate}
      emptyState={emptyState}
    />
  )
}
