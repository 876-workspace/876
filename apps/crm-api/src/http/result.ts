import { getError, isError, toAppError, type CrmErrorCode } from '@876/core'
import type { Response } from 'express'

/** Sends a registered application error without duplicating code/message/status. */
export function sendCrmError(res: Response, code: CrmErrorCode) {
  const error = getError(code)
  return res
    .status(error.httpStatus)
    .json({ data: null, error: toAppError(error) })
}

/**
 * Sends a service result while keeping expected failures as values.
 * Unexpected exceptions are deliberately not caught here; Express middleware
 * remains the final safety boundary for those.
 */
export function sendCrmResult<T>(
  res: Response,
  result: T,
  successStatus = 200
) {
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.status(successStatus).json({ data: result, error: null })
}
