import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createBankAccountsResource({
  tenant,
  integration,
}: {
  tenant?: BillingClient
  integration?: BillingIntegrationClient
}) {
  if (tenant) return tenant.bankAccounts
  if (integration) return integration.bankAccounts
  return undefined
}
