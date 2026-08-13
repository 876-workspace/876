import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createPaymentsResource({
  tenant,
  integration,
}: {
  tenant?: BillingClient
  integration?: BillingIntegrationClient
}) {
  if (tenant) return tenant.payments
  if (integration) return integration.payments
  return undefined
}
