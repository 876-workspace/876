import { getError, type CrmErrorCode } from '@876/core'

export type { CrmErrorCode } from '@876/core'

/** CRM application failures are plain registered values. */
export function crmError(code: CrmErrorCode) {
  return getError(code)
}

/**
 * @deprecated Test-compatibility shim only. Runtime CRM services and controllers
 * must not use this class for expected failures; return `crmError(code)` or
 * `getError(code)` values instead. Remove after the remaining route harnesses no
 * longer import the legacy exception type.
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
