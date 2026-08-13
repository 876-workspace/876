import type { Client as BillingClient } from '@876/billing'

export function createAddonsResource(tenant?: BillingClient) {
  return tenant?.addons
}
