import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createPaymentsResource(billing: BillingClient | BillingIntegrationClient | undefined) : any {
  if (!billing) return undefined as unknown as BillingClient['payments']
  return (billing as unknown as any as { payments: BillingClient['payments'] }).payments
}
