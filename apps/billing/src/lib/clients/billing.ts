import 'server-only'

import { create876Client } from '@876/billing'
import { cookies, headers } from 'next/headers'

import { getAuthSession, isSignedSession } from '@/lib/auth/session'

/** Billing tenant authority belongs to one signed-in user, so this is request-scoped. */
export async function getBilling() {
  const session = await getAuthSession()
  if (!isSignedSession(session))
    throw new Error(
      'A signed-in session is required to create the Billing client.'
    )

  const organizationId =
    (await cookies()).get('billing_active_org')?.value ??
    session.user.orgId ??
    undefined
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876Client({
    baseUrl: process.env.BILLING_API_URL,
    accessToken: session.accessToken,
    organizationId,
    requestId,
  })
}
