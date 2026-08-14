import 'server-only'

import { redirect } from 'next/navigation'
import { cache } from 'react'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { getPlatformClient } from '@/lib/876/platform-client'

import { getAuthSession, isSignedSession } from './session'

export async function requireSession(returnTo: string) {
  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(createLoginRedirectUrl(returnTo))
  return result.user
}

/**
 * A signed session whose account still exists and is active.
 *
 * The sealed cookie is a snapshot: it keeps proving "someone signed in" long
 * after that account was deleted or disabled in the identity API. Trusting it
 * alone walks a vanished user into the membership/authorization flow, where the
 * absence of any org lands them on `/no-access` — an authorization answer to
 * what is really a stale-session problem. So we confirm the account against the
 * identity API and treat a missing or non-active one as signed out, sending
 * them back to `/login` where a fresh sign-in re-seals the cookie (or fails).
 *
 * A platform outage must never sign a valid user out, so only an explicit
 * `user/not-found` (the account was deleted or purged) or a non-active/banned
 * status invalidates the session. Any other error falls through to the normal
 * flow, exactly as the membership and subscription reads already absorb outages.
 */
export const requireValidSession = cache(async function requireValidSession(
  returnTo: string
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
    ((data.status !== null && data.status !== 'active') || data.banned === true)

  if (accountGone || accountDisabled) redirect(createLoginRedirectUrl(returnTo))

  return session.user
})

function createLoginRedirectUrl(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `/login?${searchParams.toString()}`
}
