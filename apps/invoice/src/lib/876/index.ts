import 'server-only'

import {
  create876ServerClient,
  type Invoice876Client,
} from '@876/client/server'
import { headers } from 'next/headers'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

export async function get876Client(
  organizationId: string
): Promise<Invoice876Client> {
  const session = await getAuthSession()
  if (!isSignedSession(session) || !session.accessToken) {
    throw new Error('Not authenticated')
  }
  const hdrs = await headers()
  const requestId = hdrs.get('x-request-id') ?? undefined
  return create876ServerClient({
    app: 'invoice',
    apiKey:
      process.env.INVOICE_API_876_KEY ?? process.env.API_INTERNAL_KEY ?? '',
    accessToken: session.accessToken,
    requestId,
    services: {
      billing: {
        tenant: {
          baseUrl: process.env.BILLING_API_URL ?? 'http://127.0.0.1:4004',
          accessToken: session.accessToken,
          organizationId,
          requestId,
        },
      },
    },
  })
}
