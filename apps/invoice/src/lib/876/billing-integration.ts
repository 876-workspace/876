import 'server-only'

import { create876BillingIntegrationClient } from '@876/billing/integration'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/**
 * Builds Invoice's request-scoped Billing integration client.
 *
 * Invoice is a product app over the shared financial data plane. Product data
 * access is authorized by the app finance connection and its scopes, not by a
 * Billing workspace Member row.
 */
export async function getInvoiceBillingIntegration() {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken) redirect('/login')

  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL ?? 'http://127.0.0.1:4004',
    accessToken: session.accessToken,
    requestId,
  })
}
