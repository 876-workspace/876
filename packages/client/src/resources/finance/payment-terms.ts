import type { Client as BillingClient } from '@876/billing'

export function createPaymentTermsResource(tenant?: BillingClient) {
  return tenant?.paymentTerms
}
