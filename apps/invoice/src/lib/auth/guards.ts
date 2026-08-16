import 'server-only'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { isAccountUsable } from './account-validity'
import { getAuthSession, isSignedSession } from './session'

/**
 * Sends a viewer without a *usable* session to this app's own login, keeping
 * its place.
 *
 * Checking the cookie signature is not enough — see `isAccountUsable`, which
 * owns that rule and is shared with the context resolver so the two cannot
 * disagree about whether a session is still valid.
 */
export const requireValidSession = cache(async function requireValidSession(
  returnTo = '/'
) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect(createLoginRedirectUrl(returnTo))

  if (!(await isAccountUsable(session.user.id)))
    redirect(createLoginRedirectUrl(returnTo))

  return session.user
})

function createLoginRedirectUrl(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `/login?${searchParams.toString()}`
}
