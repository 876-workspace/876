import type { Client as BillingClient } from '@876/billing'
import type { BillingIntegrationClient } from '@876/billing/integration'

export function createPaymentModesResource({
  tenant,
  integration,
}: {
  tenant?: BillingClient
  integration?: BillingIntegrationClient
}) {
  if (tenant) return tenant.paymentModes
  if (integration) return integration.paymentModes
  return undefined
}
