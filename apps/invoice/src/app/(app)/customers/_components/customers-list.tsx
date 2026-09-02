'use client'

import type { ReactNode } from 'react'
import { CustomersList as SharedCustomersList } from '@876/billing-ui/customers-list'
import type { CustomerRow } from '@876/billing-ui/customers-table'
import { formatMoney } from '@/lib/format'

interface Props {
  customers: CustomerRow[]
  emptyState?: ReactNode
}

/**
 * Host adapter for the shared CustomersList.
 * Supplies Invoice's baseHref and money formatter.
 */
export function CustomersList({ customers, emptyState }: Props) {
  return (
    <SharedCustomersList
      customers={customers}
      baseHref="/customers"
      formatAmount={(amount, currency) => formatMoney(amount, currency)}
      emptyState={emptyState}
    />
  )
}
