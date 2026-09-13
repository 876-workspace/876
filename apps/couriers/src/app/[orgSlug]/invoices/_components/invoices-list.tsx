'use client'

import type { ReactNode } from 'react'
import { InvoicesTable, type InvoiceRow } from '@876/billing-ui/invoices-table'

import { formatMoney } from '@/lib/finance/format'

type Props = {
  invoices: InvoiceRow[]
  orgSlug: string
  emptyState?: ReactNode
}

/** Binds Couriers' money policy and routes to the shared invoices table. */
export function InvoicesList({ invoices, orgSlug, emptyState }: Props) {
  return (
    <InvoicesTable
      invoices={invoices}
      baseHref={`/${orgSlug}/invoices`}
      formatAmount={formatMoney}
      emptyState={emptyState}
    />
  )
}
