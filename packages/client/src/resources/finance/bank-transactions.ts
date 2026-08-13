import type { Client as BillingClient } from '@876/billing'

export function createBankTransactionsResource(tenant?: BillingClient) {
  return tenant?.bankTransactions
}
