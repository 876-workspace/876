import type { CustomerAccount, CustomerLedgerEntry } from './customer'

/** A statement entry enriched with its balance after the activity is posted. */
export interface CustomerAccountStatementEntry extends CustomerLedgerEntry {
  /** Account balance immediately after this entry, as a decimal string. */
  balance: string
}

/**
 * Current customer-account projection returned by Billing.
 *
 * `CustomerAccount` remains the compatibility base; these fields restore the
 * pre-Express account contract and add statement/overdue values required by the
 * shared receivables surfaces.
 */
export interface CustomerAccountProjection extends Omit<
  CustomerAccount,
  'statement'
> {
  /** Outstanding receivable whose due date is before the projection time. */
  overdueReceivable: string

  /** Balance immediately before the returned statement window. */
  openingBalance: string

  /** Balance after the final returned statement entry. */
  closingBalance: string

  /** Latest account activity in chronological order with running balances. */
  statement: CustomerAccountStatementEntry[]
}
