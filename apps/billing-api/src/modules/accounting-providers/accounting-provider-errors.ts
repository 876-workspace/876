import { isErrorCode, type BillingErrorCode } from '@876/core'

import { appError, isAppHttpError } from '@/http/errors'
import { AccountingProviderError } from '@/providers/accounting'

/** Resolve one Billing accounting-provider error through the shared catalog. */
export function accountingProviderError(
  code: BillingErrorCode,
  options: { cause?: unknown } = {}
) {
  return appError(code, options)
}

/**
 * Converts an expected provider-adapter failure into Billing's registered HTTP
 * contract. Unknown failures stay unknown so the central error handler logs and
 * returns the generic unexpected-500 response.
 */
export function toAccountingProviderHttpError(error: unknown): unknown {
  if (isAppHttpError(error)) return error
  if (error instanceof AccountingProviderError && isErrorCode(error.code))
    return appError(error.code, { cause: error })
  return error
}

/** Run provider I/O at an HTTP-facing module boundary. */
export async function accountingProviderCall<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    throw toAccountingProviderHttpError(error)
  }
}
