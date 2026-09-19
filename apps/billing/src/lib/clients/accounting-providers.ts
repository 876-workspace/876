import 'server-only'

import { create876BillingOperatorClient } from '@876/billing/operator'
import { headers } from 'next/headers'

/**
 * Server-only accounting-provider administration client for the Billing app.
 *
 * The internal key never crosses the RSC/route-handler boundary. Browser
 * mutations go through Billing-owned same-origin routes, which re-check the
 * signed-in member before invoking this client.
 */
export async function getAccountingProviderClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876BillingOperatorClient({
    baseUrl: process.env.BILLING_API_URL,
    internalKey:
      process.env.BILLING_INTERNAL_KEY ?? process.env.API_INTERNAL_KEY,
    requestId,
  })
}
