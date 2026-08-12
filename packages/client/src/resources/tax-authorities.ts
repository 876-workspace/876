import type { Client as BillingClient } from '@876/billing'

export function createTaxAuthoritiesResource(billing: BillingClient | undefined) {
  return (billing as unknown as { taxAuthorities: unknown })?.taxAuthorities as unknown
}
