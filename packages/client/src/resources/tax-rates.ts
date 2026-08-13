import type { Client as BillingClient } from '@876/billing'

export function createTaxRatesResource(tenant?: BillingClient) {
  return tenant?.taxRates
}
