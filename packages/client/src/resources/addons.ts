import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createAddonsResource(
  billing: BillingClient | BillingIntegrationClient | undefined
): any {
  if (!billing) return undefined as unknown as BillingClient['addons']
  return (billing as unknown as any as { addons: BillingClient['addons'] })
    .addons
}
