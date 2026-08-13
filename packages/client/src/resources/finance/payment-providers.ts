import type { Client as BillingClient } from '@876/billing'

export function createPaymentProvidersResource(tenant?: BillingClient) {
  return tenant?.paymentProviders
}
