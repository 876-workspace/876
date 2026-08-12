import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createSubscriptionsResource(
  billing: BillingClient | BillingIntegrationClient | undefined
): any {
  if (!billing) return undefined as unknown as BillingClient['subscriptions']
  return (
    billing as unknown as any as {
      subscriptions: BillingClient['subscriptions']
    }
  ).subscriptions
}
