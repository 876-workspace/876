'use client'

import {
  CustomersTable as CustomersTableView,
  type CustomersTableProps,
} from '@876/billing-ui/customers-table'
import {
  InvoicesTable as InvoicesTableView,
  type InvoicesTableProps,
} from '@876/billing-ui/invoices-table'
import {
  ItemsTable as ItemsTableView,
  type ItemsTableProps,
} from '@876/billing-ui/items-table'
import {
  PaymentsTable as PaymentsTableView,
  type PaymentsTableProps,
} from '@876/billing-ui/payments-table'

import { formatBillingDate } from '../dates'
import { formatBillingAmount } from '../money'

/**
 * Console's bindings of the shared finance tables to its own formatters.
 *
 * The shared tables take `formatAmount`/`formatDate` because money and date
 * conventions are host policy — but a function cannot cross the RSC boundary,
 * and Console renders these tables from server pages. Binding the formatters
 * inside a client module is what lets a server page pass rows alone.
 *
 * The imported primitives are aliased rather than the local components renamed:
 * the app-local component owns the plain name (`.claude/rules/app-structure.md`).
 */

export function CustomersTable(
  props: Omit<CustomersTableProps, 'formatAmount'>
) {
  return <CustomersTableView {...props} formatAmount={formatBillingAmount} />
}

export function InvoicesTable(props: Omit<InvoicesTableProps, 'formatAmount'>) {
  return <InvoicesTableView {...props} formatAmount={formatBillingAmount} />
}

export function ItemsTable(props: Omit<ItemsTableProps, 'formatAmount'>) {
  return <ItemsTableView {...props} formatAmount={formatBillingAmount} />
}

export function PaymentsTable(
  props: Omit<PaymentsTableProps, 'formatAmount' | 'formatDate'>
) {
  return (
    <PaymentsTableView
      {...props}
      formatAmount={formatBillingAmount}
      formatDate={formatBillingDate}
    />
  )
}
