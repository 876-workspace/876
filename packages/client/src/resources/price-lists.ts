import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createPriceListsResource(billing: BillingClient | BillingIntegrationClient | undefined) : any {
  if (!billing) return undefined as unknown as BillingClient['priceLists']
  return (billing as unknown as any as { priceLists: BillingClient['priceLists'] }).priceLists
}
