import 'server-only'

import { AUTH_RETURN_TO_PARAM } from '@876/core/auth/return-to'
import { redirect } from 'next/navigation'

/**
 * Error codes that mean "this viewer is not signed in", whoever reports them.
 *
 * These are the answers a data call gives when the credential behind the
 * request is gone or no longer accepted. They are an authentication verdict,
 * not a service fault, so they must never be rendered as an error panel — a
 * signed-out viewer needs the login screen, and an "unavailable right now,
 * please try again shortly" message sends them into an endless reload of a
 * page they can never load.
 */
const SIGNED_OUT_ERROR_CODES: ReadonlySet<string> = new Set([
  'auth/invalid-token',
  'auth/no-session',
  'auth/session-expired',
  'auth/unauthorized',
])

export function isSignedOutError(code: string | null | undefined): boolean {
  return code !== null && code !== undefined && SIGNED_OUT_ERROR_CODES.has(code)
}

/**
 * Sends the viewer to login when `code` says they are no longer authenticated.
 *
 * Call this before any other handling of a failed data call, so an auth verdict
 * is never reported as a service outage. Returns normally — and lets the caller
 * render its own error state — for every other code.
 */
export function redirectIfSignedOut(
  code: string | null | undefined,
  returnTo: string
): void {
  if (!isSignedOutError(code)) return

  const searchParams = new URLSearchParams({ [AUTH_RETURN_TO_PARAM]: returnTo })
  redirect(`/login?${searchParams.toString()}`)
}
