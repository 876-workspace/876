import 'server-only'

import { create876Client as createBillingClient, type Client } from '@876/billing'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'
import { getInvoiceBillingConfig } from '@/lib/services/billing-config'

/**
 * Request-scoped Billing tenant client for Invoice.
 *
 * Invoice is a restricted product experience over Billing's data plane, so its
 * financial resources stay Billing-owned rather than being projected onto a
 * global `$876` facade.
 */
export async function getBilling(organizationId: string): Promise<Client> {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken) redirect('/login')

  const requestId = (await headers()).get('x-request-id') ?? undefined
  const { baseUrl } = getInvoiceBillingConfig()

  return createBillingClient({
    baseUrl,
    accessToken: session.accessToken,
    organizationId,
    requestId,
  })
}
