import 'server-only'

import { create876BillingOperatorClient } from '@876/billing/operator'
import { create876BillingServiceClient } from '@876/billing/service'

function options(requestId?: string) {
  return {
    baseUrl: process.env.BILLING_API_URL,
    internalKey: process.env.BILLING_INTERNAL_KEY!,
    requestId,
  }
}

/** Organization-scoped first-party Billing capabilities used by Console. */
export function createBilling(requestId?: string) {
  return create876BillingServiceClient(options(requestId))
}

/** Billing-owned operator capabilities such as catalog and aggregate administration. */
export function createBillingOperator(requestId?: string) {
  return create876BillingOperatorClient(options(requestId))
}

export const billing = createBilling()
export const billingOperator = createBillingOperator()
