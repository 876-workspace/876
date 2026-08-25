import 'server-only'

import { createAuthLoginPath } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { isAccountUsable } from './account-validity'
import { getAuthSession, isSignedSession } from './session'

export async function requireSession(returnTo: string) {
  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(createAuthLoginPath(returnTo))

  return result.user
}

/** A signed session whose platform account still exists and is active. */
export const requireValidSession = cache(async function requireValidSession(
  returnTo: string
) {
  const session = await getAuthSession()
  if (!isSignedSession(session)) redirect(createAuthLoginPath(returnTo))

  if (!(await isAccountUsable(session.user.id)))
    redirect(createAuthLoginPath(returnTo))

  return session.user
})
