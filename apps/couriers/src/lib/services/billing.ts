import 'server-only'

import { create876BillingServiceClient } from '@876/billing/service'

/** First-party Billing service access used by Couriers-owned workflows. */
export function createBillingService(requestId?: string) {
  return create876BillingServiceClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.API_876_KEY!,
    requestId,
  })
}

export const billing = createBillingService()
