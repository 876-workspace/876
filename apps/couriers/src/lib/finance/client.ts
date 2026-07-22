import 'server-only'

import { create876BillingIntegrationClient } from '@876/billing/integration'
import { headers } from 'next/headers'

/** Product-scoped Billing client. The Couriers API key never reaches a browser. */
export async function getFinanceClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.API_876_KEY,
    requestId,
  })
}
