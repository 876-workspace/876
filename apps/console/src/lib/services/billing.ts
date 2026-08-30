import 'server-only'

import { create876BillingOperatorClient } from '@876/billing/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.BILLING_API_URL,
    internalKey: process.env.BILLING_INTERNAL_KEY!,
    requestId,
  }
}

export function createBilling(requestId?: string) {
  return create876BillingOperatorClient(options(requestId))
}

export const billing = createBilling()
