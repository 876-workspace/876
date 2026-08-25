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
 * Checking the cookie signature is not enough — see `isAccountUsable`, which
 * owns that rule and is shared with the context resolver so the two cannot
 * disagree about whether a session is still valid.
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
