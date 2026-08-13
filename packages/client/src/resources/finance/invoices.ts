import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createInvoicesResource({
  tenant,
  integration,
}: {
  tenant?: BillingClient
  integration?: BillingIntegrationClient
}) {
  if (tenant) return tenant.invoices
  if (integration) return integration.invoices
  return undefined
}
