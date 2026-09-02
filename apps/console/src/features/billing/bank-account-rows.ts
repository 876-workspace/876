import type { BankAccountRow } from '@876/billing-ui/bank-accounts-grid'
import type { BillingBankAccount } from '@876/billing/service'

/**
 * Projects serialized deposit accounts onto the shared grid's row shape.
 *
 * `balance` is deliberately left unset: it is derived from an account's bank
 * transactions, which the organization-scoped account list does not carry, and
 * a zero would read as a real balance rather than as an absent one.
 */
export function toBankAccountRows(
  accounts: readonly BillingBankAccount[]
): BankAccountRow[] {
  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    accountTypeLabel: accountTypeLabel(account.accountType),
    currency: account.currency,
    isActive: account.isActive,
  }))
}

/** `OTHER_ASSET` reads as "Other asset" rather than as a wire value. */
function accountTypeLabel(accountType: string): string {
  const words = accountType.toLowerCase().split('_')
  const [first, ...rest] = words
  if (!first) return accountType

  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ')
}
