'use client'

import type { ReactNode } from 'react'
import { CustomersList as SharedCustomersList } from '@876/billing-ui/customers-list'
import type { CustomerRow } from '@876/billing-ui/customers-table'
import { formatMoney } from '@/lib/format'
import type { CustomerTableRow } from '@/types/customer'

interface Props {
  customers: (CustomerTableRow | CustomerRow)[]
  emptyState?: ReactNode
}

/**
 * Host adapter for the shared CustomersList.
 * Supplies Billing's baseHref and money formatter.
 */
export function CustomersList({ customers, emptyState }: Props) {
  const sharedCustomers: CustomerRow[] = customers.map((customer) => ({
    ...customer,
    receivables:
      typeof customer.receivables === 'number'
        ? String(customer.receivables)
        : customer.receivables,
  }))

  return (
    <SharedCustomersList
      customers={sharedCustomers}
      baseHref="/customers"
      formatAmount={(amount, currency) => formatMoney(amount, currency)}
      emptyState={emptyState}
    />
  )
}
