'use client'

import type { ComponentProps, ReactNode } from 'react'
import { RecurringInvoicesList as SharedRecurringInvoicesList } from '@876/billing-ui/recurring-invoices-list'

import { formatDate, formatMoney } from '@/lib/format'

type RecurringInvoiceRow = ComponentProps<
  typeof SharedRecurringInvoicesList
>['profiles'][number]

export function RecurringInvoicesList({
  profiles,
  emptyState,
}: {
  profiles: RecurringInvoiceRow[]
  emptyState?: ReactNode
}) {
  return (
    <SharedRecurringInvoicesList
      profiles={profiles}
      baseHref="/recurring-invoices"
      formatAmount={formatMoney}
      formatDate={(timestamp) => formatDate(timestamp)}
      emptyState={emptyState}
    />
  )
}
