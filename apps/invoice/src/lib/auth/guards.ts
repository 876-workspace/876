import 'server-only'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'

import { getAuthSession, isSignedSession } from './session'

/** Sends an unauthenticated viewer to this app's own login, keeping its place. */
export async function requireValidSession(returnTo = '/'): Promise<void> {
  const session = await getAuthSession()
  if (!isSignedSession(session)) {
    redirect(`/login?${AUTH_RETURN_TO_PARAM}=${encodeURIComponent(returnTo)}`)
  }
}
