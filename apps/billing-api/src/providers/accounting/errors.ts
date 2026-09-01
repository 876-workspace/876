import { getError, isErrorCode } from '@876/core'

/**
 * Provider-layer accounting error.
 *
 * The provider layer is a leaf: it must not import Billing's HTTP error types.
 * It raises this instead, carrying the registered catalog code, and the owning
 * module maps it onto the HTTP contract at the boundary.
 */
export class AccountingProviderError extends Error {
  readonly code: string
  readonly httpStatus: number | null
  readonly retryable: boolean

  constructor(options: {
    code: string
    message?: string
    httpStatus?: number | null
    retryable?: boolean
    cause?: unknown
  }) {
    const registered = isErrorCode(options.code) ? getError(options.code) : null
    super(
      options.message ??
        registered?.message ??
        'An accounting provider error occurred.',
      options.cause === undefined ? undefined : { cause: options.cause }
    )
    this.name = 'AccountingProviderError'
    this.code = registered?.code ?? options.code
    this.httpStatus = options.httpStatus ?? registered?.httpStatus ?? null
    this.retryable = options.retryable ?? false
  }
}
