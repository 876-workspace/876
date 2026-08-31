import 'server-only'

import { create876BillingIntegrationClient } from '@876/billing/integration'

/** Organization-scoped Billing integration client for Couriers portal operations. */
export function createBillingIntegration(requestId?: string) {
  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.API_876_KEY!,
    requestId,
  })
}

export const billingIntegration = createBillingIntegration()
