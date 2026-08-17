import 'server-only'

import { create876BillingIntegrationClient } from '@876/billing/integration'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/**
 * Builds Invoice's request-scoped Billing integration client.
 *
 * The signed-in user is validated by Invoice first. The service-to-service hop
 * then authenticates as the 876 Invoice product app so Billing authorizes data
 * access through the app finance connection and its published scopes, not a
 * Billing workspace Member row or delegated-user Billing scopes.
 */
export async function getInvoiceBillingIntegration() {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect('/login')

  const apiKey = process.env.INVOICE_API_876_KEY?.trim()
  if (!apiKey)
    throw new Error(
      'INVOICE_API_876_KEY is required for Invoice Billing integration.'
    )

  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876BillingIntegrationClient({
    baseUrl: process.env.BILLING_API_URL ?? 'http://127.0.0.1:4004',
    apiKey,
    requestId,
  })
}
