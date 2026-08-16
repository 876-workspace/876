import 'server-only'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { getPlatformClient } from '@/lib/876/platform-client'

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
 * Without this, a purged account kept passing the guard and only failed at the
 * first data call, which surfaced as `auth/invalid-token` rendered into a
 * generic "unavailable right now" panel — an error screen for what is simply a
 * signed-out viewer, with no way back to login.
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
  if (!isSignedSession(session)) redirect(createLoginRedirectUrl(returnTo))

  const platform = await getPlatformClient()
  const { data, error } = await platform.users.retrieve({
    id: session.user.id,
  })

  const accountGone = error?.code === 'user/not-found'
  const accountDisabled =
    data !== null &&
    data !== undefined &&
    ((data.status !== null && data.status !== 'active') || data.banned === true)

  if (accountGone || accountDisabled) redirect(createLoginRedirectUrl(returnTo))

  return session.user
})

function createLoginRedirectUrl(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `/login?${searchParams.toString()}`
}
