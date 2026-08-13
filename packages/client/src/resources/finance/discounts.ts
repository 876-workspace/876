import type { Client as BillingClient } from '@876/billing'

export function createDiscountsResource(tenant?: BillingClient) {
  return tenant?.discounts
}
