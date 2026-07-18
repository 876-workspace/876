/**
 * Authorization-safe result unwrapping for client packages and server routing.
 *
 * Callers making access-control decisions must distinguish a definitive
 * "resource does not exist" from an indeterminate failure. Collapsing both to
 * `null` makes transient API failures look like denied access.
 *
 * @module @876/core/client/lookup
 */

export type LookupError = { code: string; message: string }

export type LookupResult<T> =
  | { data: T; error: null }
  | { data: null; error: LookupError }

const definitiveNotFoundCodes = new Set([
  'account/not-found',
  'address/not-found',
  'api-key/not-found',
  'app-assignment/app-not-found',
  'app-assignment/member-not-found',
  'app-assignment/not-found',
  'app/not-found',
  'contact/not-found',
  'department/not-found',
  'employee/not-found',
  'feature/not-found',
  'feature/user-not-found',
  'invite/app-not-found',
  'invite/not-found',
  'invite/user-not-found',
  'location/not-found',
  'membership/not-found',
  'oauth-grant/not-found',
  'organization/not-found',
  'product/not-found',
  'profile/not-found',
  'reserved_username/not-found',
  'role/not-found',
  'subscription/not-found',
  'user-feature/not-found',
  'user/not-found',
])

/** Raised when an authz lookup fails for a reason other than "not found". */
export class ResourceLookupError extends Error {
  readonly code: string

  constructor(context: string, error: LookupError) {
    super(`Failed to resolve ${context}: ${error.message} (${error.code})`)
    this.name = 'ResourceLookupError'
    this.code = error.code
  }
}

/**
 * A genuine resource miss, and the only error an authorization decision may
 * safely treat as a definitive negative. Session/auth/provider failures are
 * intentionally excluded even when their code contains "not-found".
 */
export function isNotFoundError(error: LookupError | null): boolean {
  return error !== null && definitiveNotFoundCodes.has(error.code)
}

/**
 * Unwrap a single-resource lookup used in an authorization decision.
 *
 * Returns the resource, or `null` only when the API definitively reports that
 * the resource does not exist. Any other error throws.
 */
export function unwrapOptional<T>(
  result: LookupResult<T>,
  context: string
): T | null {
  if (!result.error) return result.data
  if (isNotFoundError(result.error)) return null
  throw new ResourceLookupError(context, result.error)
}

/**
 * Unwrap a required lookup. Throws on any error because list-style and required
 * reads represent absence through their successful data shape, not an error.
 */
export function unwrapResult<T>(result: LookupResult<T>, context: string): T {
  if (result.error) throw new ResourceLookupError(context, result.error)
  return result.data
}
