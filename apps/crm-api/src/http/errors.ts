import { getError, type CrmErrorCode } from '@876/core'

export type { CrmErrorCode } from '@876/core'

/**
 * Compatibility wrapper for the remaining exception-based CRM call sites.
 *
 * The canonical code, message, and HTTP status always come from @876/core.
 * New expected-failure paths should return the value from `getError()` instead
 * of throwing this wrapper; this class remains only while the service migration
 * is completed.
 */
export class CrmHttpError extends Error {
  readonly code: CrmErrorCode
  readonly httpStatus: number

  constructor(code: CrmErrorCode) {
    const error = getError(code)

    super(error.message)
    this.name = 'CrmHttpError'
    this.code = error.code
    this.httpStatus = error.httpStatus
  }
}

/** Creates a registered CRM error using the canonical core catalog. */
export function crmError(code: CrmErrorCode): CrmHttpError {
  return new CrmHttpError(code)
}
