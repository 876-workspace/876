import 'server-only'

import { redirect } from 'next/navigation'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'

import { getAuthSession, isSignedSession } from './session'

export async function requireSession(returnTo: string) {
  const result = await getAuthSession()
  if (!isSignedSession(result)) redirect(createLoginRedirectUrl(returnTo))
  return result.user
}

function createLoginRedirectUrl(returnTo: string): string {
  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  return `/login?${searchParams.toString()}`
}
