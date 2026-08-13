import type { Client as BillingClient } from '@876/billing'

export function createPriceListsResource(tenant?: BillingClient) {
  return tenant?.priceLists
}
