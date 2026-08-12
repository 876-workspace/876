import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createPlansResource(
  billing: BillingClient | BillingIntegrationClient | undefined
): any {
  if (!billing) return undefined as unknown as BillingClient['plans']
  return (billing as unknown as any as { plans: BillingClient['plans'] }).plans
}
