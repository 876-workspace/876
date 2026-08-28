import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import {
  AUTH_CALLBACK_ERROR_PARAM,
  resolveAuthCallbackMessage,
} from '@876/core/auth/callback-error'
import { resolveRelativeReturnTo } from '@876/core/auth/return-to'

import { isAccountUsable } from '@/lib/auth/account-validity'
import { getAuthSession, isSignedSession } from '@/lib/auth/session'

import { EmbeddedAuth } from './_components/embedded-auth'

export const metadata: Metadata = {
  title: 'Login',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    returnTo?: string | string[]
    [AUTH_CALLBACK_ERROR_PARAM]?: string | string[]
  }>
}) {
  const params = await searchParams
  const rawReturnTo = Array.isArray(params.returnTo)
    ? params.returnTo[0]
    : params.returnTo
  const returnTo = resolveRelativeReturnTo(rawReturnTo, '/')
  const authError = resolveAuthCallbackMessage(
    params[AUTH_CALLBACK_ERROR_PARAM]
  )

  const session = await getAuthSession()
  // Only bounce an *actually usable* session away from the login form. Trusting
  // the cookie alone deadlocked the app: a deleted account still held a valid
  // cookie, so login redirected into the app, the app's guard reported it
  // signed out and redirected back here — ERR_TOO_MANY_REDIRECTS. Falling
  // through to the form lets the next sign-in overwrite the stale cookie.
  if (isSignedSession(session) && (await isAccountUsable(session.user.id)))
    redirect(returnTo)

  return <EmbeddedAuth returnTo={returnTo} authError={authError} />
}
