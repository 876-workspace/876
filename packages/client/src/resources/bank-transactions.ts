import type { Client as BillingClient } from '@876/billing'

export function createBankTransactionsResource(billing: BillingClient | undefined) : any {
  return (billing as unknown as any as { bankTransactions: unknown })?.bankTransactions as unknown
}
