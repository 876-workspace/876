import 'server-only'

import { create876AccountClient } from '@876/account'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/** Account authority belongs to the signed-in Billing user, so this is request-scoped. */
export async function getAccount() {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    throw new Error(
      'A signed-in session is required to create the account client.'
    )

  return create876AccountClient({
    baseUrl: process.env.API_URL,
    apiKey: process.env.BILLING_API_876_KEY,
    accessToken: session.accessToken,
  })
}
