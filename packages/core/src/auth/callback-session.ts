/**
 * Detecting a session that a social callback has *already* established.
 *
 * An OAuth authorization code is single-use. The desktop browser requests
 * `/callback?code=…` exactly once, so spending the code and redirecting onward
 * is the whole story there. Mobile browsers routinely request it more than
 * once — a speculative navigation, a provider app handing the URL back to the
 * default browser, or a restored tab replaying the redirect. The first request
 * exchanges the code and sets the session cookie; the second finds the code
 * already spent, the API answers 401, and the callback redirects to
 * `/login?authError=auth/oauth-failed` — **throwing away a session that was
 * already established one request earlier**.
 *
 * That is why social sign-in works on production web and appears to do nothing
 * on mobile: the sign-in did succeed, and the duplicate request undid it.
 *
 * The fix is to make the callback idempotent. Before spending the code, and
 * again whenever the exchange fails, ask whether this request already carries a
 * valid session for this app. If it does, the user is signed in and belongs in
 * the app — not back on the login screen.
 *
 * @module @876/core/auth/callback-session
 */

import { verifySession876 } from './session-cookie'

const DEFAULT_SESSION_COOKIE_NAME = '876-session'

/** The session cookie name this deployment reads. */
export function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME || DEFAULT_SESSION_COOKIE_NAME
}

/**
 * Whether the incoming request already carries a valid, signed 876 session.
 *
 * Verification is local (HMAC over the shared cookie secret) — the same check
 * every app's route guards already trust — so this costs no network round trip
 * on the redirect path.
 *
 * @param request - The incoming callback request.
 * @returns `true` when a signed, unexpired session cookie is present.
 */
export async function hasEstablishedSession(request: {
  cookies: { get: (name: string) => { value: string } | undefined }
}): Promise<boolean> {
  const cookie = request.cookies.get(sessionCookieName())
  if (!cookie?.value) return false

  const session = await verifySession876(cookie.value)
  return Boolean(session?.userId)
}
