import 'server-only'

import { createAuthLoginPath } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { isAccountUsable } from './account-validity'
import { getAuthSession, isSignedSession } from './session'

/**
 * Sends a viewer without a *usable* session to this app's own login, keeping
 * its place.
 *
 * A sealed session cookie only proves that someone signed in at some point —
 * it keeps verifying long after the account behind it was deleted, banned, or
 * suspended, because nothing in the cookie changes when the account does. So
 * the signature check alone is not an authorization answer: the account is
 * confirmed to still exist and still be active against the identity API on
 * every request.
 *
 * Without this, a purged account still reached the app, resolved no
 * memberships, and was routed to /get-started — asked to create an
 * organization it could never create, with no route back to login.
 *
 * Deliberately fails **open** on any other error: an identity-API outage must
 * not sign out every signed-in operator. Only the two answers that positively
 * establish the session is no longer valid — the account is gone, or it is
 * disabled — redirect.
 */
export const requireValidSession = cache(async function requireValidSession(
  returnTo = '/'
) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect(createAuthLoginPath(returnTo))

  if (!(await isAccountUsable(session.user.id)))
    redirect(createAuthLoginPath(returnTo))

  return session.user
})
