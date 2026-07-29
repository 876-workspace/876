import 'server-only'

import { create876Client } from '@876/client'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/**
 * Creates the request-scoped 876 client for Enterprise.
 *
 * The app API key identifies Enterprise; the signed-in user's access token
 * supplies the delegated principal used by every self-scoped API operation.
 */
export async function get876ServerClient() {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    throw new Error('A signed-in session is required to create the 876 client.')
  }

  return create876Client({
    baseUrl: process.env.API_URL,
    apiKey: process.env.API_876_KEY,
    accessToken: session.accessToken,
    fetch,
  })
}
