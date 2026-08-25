import 'server-only'

import { create876BillingIntegrationClient } from '@876/billing/integration'
import { headers } from 'next/headers'

export async function getCrmBillingIntegration() {
  const requestId = (await headers()).get('x-request-id') ?? undefined
  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL,
    apiKey: process.env.CRM_API_876_KEY,
    requestId,
  })
}
