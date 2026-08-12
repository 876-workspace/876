import type { BillingIntegrationClient } from '@876/billing/integration'

export function createItemsResource(billing: BillingIntegrationClient | undefined) {
  if (!billing) return undefined as unknown as BillingIntegrationClient['items']
  return (billing as unknown as { items: BillingIntegrationClient['items'] }).items
}
