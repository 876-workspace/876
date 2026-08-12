import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createTaxRatesResource(billing: BillingClient | BillingIntegrationClient | undefined) : any {
  if (!billing) return undefined as unknown as BillingClient['taxRates']
  return (billing as unknown as any as { taxRates: BillingClient['taxRates'] }).taxRates
}
