/**
 * The `?authError=` contract between an app's `/callback` route and its login
 * page.
 *
 * Every app's social-auth callback already redirects to
 * `/login?authError=<code>` when the provider hands back an error or the code
 * exchange fails — but no login page ever read the parameter, so a failed
 * social sign-in rendered a blank sign-in form. That is indistinguishable from
 * "nothing happened", which is precisely how the failure was reported from
 * mobile: the browser visibly returned from the provider and then sat on the
 * login screen with no explanation.
 *
 * @module @876/core/auth/callback-error
 */

/** Query parameter a callback route uses to explain why it bounced to login. */
export const AUTH_CALLBACK_ERROR_PARAM = 'authError'

/**
 * Reasons a social callback can end on the login page.
 *
 * These are a deliberate subset of the platform auth error codes: they are the
 * only ones a `/callback` route can itself produce, and each needs wording that
 * makes sense on a sign-in screen rather than beside a form field.
 */
export const AUTH_CALLBACK_ERROR_CODES = [
  'auth/oauth-cancelled',
  'auth/oauth-failed',
  'auth/missing-code',
] as const

export type AuthCallbackErrorCode = (typeof AUTH_CALLBACK_ERROR_CODES)[number]

const AUTH_CALLBACK_ERROR_MESSAGES: Record<AuthCallbackErrorCode, string> = {
  'auth/oauth-cancelled': 'Sign-in was cancelled. Please try again.',
  'auth/oauth-failed':
    'We could not complete sign-in with that provider. Please try again.',
  'auth/missing-code':
    'Your sign-in link has expired or was already used. Please try again.',
}

const FALLBACK_MESSAGE = 'We could not complete sign-in. Please try again.'

/**
 * Resolves an untrusted `?authError=` value to a message safe to render.
 *
 * Returns `null` when the parameter is absent so a caller can skip the banner
 * entirely, and falls back to a generic message for an unrecognized value
 * rather than echoing attacker-supplied text back into the page.
 */
export function resolveAuthCallbackMessage(
  value: string | string[] | null | undefined
): string | null {
  const code = Array.isArray(value) ? value[0] : value
  if (!code?.trim()) return null

  return isAuthCallbackErrorCode(code)
    ? AUTH_CALLBACK_ERROR_MESSAGES[code]
    : FALLBACK_MESSAGE
}

export function isAuthCallbackErrorCode(
  value: string
): value is AuthCallbackErrorCode {
  return (AUTH_CALLBACK_ERROR_CODES as readonly string[]).includes(value)
}
