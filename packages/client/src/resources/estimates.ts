import type { Client as BillingClient } from '@876/billing'

export function createEstimatesResource(billing: BillingClient | undefined) {
  // Billing estimates not yet exposed via tenant client; return undefined placeholder
  return (billing as unknown as { estimates?: unknown })?.estimates as unknown
}
