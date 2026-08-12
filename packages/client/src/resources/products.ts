import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createProductsResource(billing: BillingClient | BillingIntegrationClient | undefined) : any {
  if (!billing) return undefined as unknown as BillingClient['products']
  return (billing as unknown as any as { products: BillingClient['products'] }).products
}
