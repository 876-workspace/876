import type { Client as BillingClient } from '@876/billing'

export function createTaxAuthoritiesResource(tenant?: BillingClient) {
  return tenant?.taxAuthorities
}
