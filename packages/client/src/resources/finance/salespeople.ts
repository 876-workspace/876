import type { Client as BillingClient } from '@876/billing'

export function createSalespeopleResource(tenant?: BillingClient) {
  return tenant?.salespeople
}
