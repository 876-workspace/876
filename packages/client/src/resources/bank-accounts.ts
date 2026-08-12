import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createBankAccountsResource(billing: BillingClient | BillingIntegrationClient | undefined) : any {
  if (!billing) return undefined as unknown as BillingClient['bankAccounts']
  return (billing as unknown as any as { bankAccounts: BillingClient['bankAccounts'] }).bankAccounts
}
