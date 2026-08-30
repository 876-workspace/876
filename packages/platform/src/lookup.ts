/**
 * Authorization-safe result unwrapping.
 *
 * Uses `@876/core` for the shared not-found policy while keeping the admin
 * package's public `AdminLookupError` class stable.
 *
 * @module @876/admin/lookup
 */

import { isNotFoundError } from '@876/core/client/lookup'
import type { LookupError, LookupResult } from '@876/core/client/lookup'

export { isNotFoundError }
export type AdminError = LookupError

/** Raised when an admin authz lookup fails for a reason other than not found. */
export class AdminLookupError extends Error {
  readonly code: string

  constructor(context: string, error: AdminError) {
    super(`Failed to resolve ${context}: ${error.message} (${error.code})`)
    this.name = 'AdminLookupError'
    this.code = error.code
  }
}

export function unwrapOptional<T>(
  result: LookupResult<T>,
  context: string
): T | null {
  if (!result.error) return result.data
  if (isNotFoundError(result.error)) return null
  throw new AdminLookupError(context, result.error)
}

export function unwrapResult<T>(result: LookupResult<T>, context: string): T {
  if (result.error) throw new AdminLookupError(context, result.error)
  return result.data
}
