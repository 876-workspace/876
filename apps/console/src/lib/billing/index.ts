import 'server-only'

import { create876AdminClient } from '@876/billing/admin'
import { create876BillingIntegrationClient } from '@876/billing/integration'

/** Server-only client for 876 Billing's versioned administration surface. */
export const $billing = create876AdminClient({
  baseUrl: process.env.BILLING_API_URL,
  internalKey: process.env.BILLING_INTERNAL_KEY,
})

/**
 * Official cross-application Billing interface. Console composes core identity
 * data from `$876` with Billing-owned resources from this client; it never
 * imports Billing's datastore or service implementation.
 */
export function getBillingIntegrationClient(requestId?: string) {
  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL,
    internalKey: process.env.BILLING_INTERNAL_KEY,
    requestId,
  })
}

export const $billingIntegration = getBillingIntegrationClient()
