export const AUTH_RETURN_TO_PARAM = 'returnTo'

export const AUTH_RETURN_TO_COOKIE = 'efesto_auth_return_to'

export const AUTH_CLIENT_ID_PARAM = 'client_id'

export const DEFAULT_AUTH_RETURN_TO = '/'

const AUTH_RETURN_TO_BLOCKED_PATHS = [
  '/login',
  '/register',
  '/recover',
  '/reset-password',
  '/verify-email',
  '/verify-otp',
] as const

/**
 * Resolves a safe first-party return path for app-owned auth navigation.
 */
export function resolveRelativeReturnTo(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_RETURN_TO
): string {
  const requested = value?.trim()
  if (!requested) return fallback

  if (!isAppRelativeReturnTo(requested)) return fallback
  if (isBlockedAuthReturnTo(requested)) return fallback

  return requested
}

/**
 * Builds a first-party return path from a request pathname and search string.
 */
export function createReturnToPath(pathname: string, search = ''): string {
  return resolveRelativeReturnTo(`${pathname}${search}`)
}

/**
 * Builds the standard embedded-auth login URL used by first-party apps.
 *
 * The `returnTo` is resolved through the same rules the login pages apply when
 * they read it back, so this single writer cannot emit an off-site destination
 * or a login → login loop even if a caller hands it one.
 */
export function createAuthLoginPath(returnTo: string): string {
  const searchParams = new URLSearchParams({
    [AUTH_RETURN_TO_PARAM]: resolveRelativeReturnTo(returnTo),
  })
  return `/login?${searchParams.toString()}`
}

function isAppRelativeReturnTo(value: string): boolean {
  return (
    value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
  )
}

function isBlockedAuthReturnTo(value: string): boolean {
  return AUTH_RETURN_TO_BLOCKED_PATHS.some(
    (path) => value === path || value.startsWith(`${path}?`)
  )
}
