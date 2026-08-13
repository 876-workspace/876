import type { BillingIntegrationClient } from '@876/billing/integration'

export function createItemsResource(integration?: BillingIntegrationClient) {
  if (!integration) return undefined
  return integration.items
}
