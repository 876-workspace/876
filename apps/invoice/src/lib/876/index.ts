import 'server-only'

import {
  create876ServerClient,
  type Invoice876Client,
} from '@876/client/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/**
 * Builds the request-scoped Invoice client. The Billing tenant transport is
 * bound to the caller's own access token and organization, so Invoice never
 * holds a privileged credential — an app key only, never the internal key.
 */
export async function get876Client(
  organizationId: string
): Promise<Invoice876Client> {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken) redirect('/login')

  const requestId = (await headers()).get('x-request-id') ?? undefined
  const accessToken = session.accessToken

  return create876ServerClient({
    app: 'invoice',
    apiKey: process.env.INVOICE_API_876_KEY ?? '',
    accessToken,
    requestId,
    services: {
      billing: {
        tenant: {
          baseUrl: process.env.BILLING_API_URL ?? 'http://127.0.0.1:4004',
          accessToken,
          organizationId,
          requestId,
        },
      },
    },
  })
}
