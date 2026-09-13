import {
  isError,
  toAppError,
  type Error as AppErrorValue,
} from '@876/core'
import type { Response } from 'express'

/** Sends a new-style Billing service result without throwing expected errors. */
export function sendBillingResult<T>(
  res: Response,
  result: T | AppErrorValue,
  successStatus = 200
) {
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.status(successStatus).json({ data: result, error: null })
}

/** Sends a paginated Billing collection while preserving value failures. */
export function sendBillingList<T>(
  res: Response,
  result: { data: T[]; hasMore: boolean } | AppErrorValue,
  url: string
) {
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.json({
    data: {
      object: 'list',
      data: result.data,
      has_more: result.hasMore,
      total_count: result.hasMore ? null : result.data.length,
      url,
    },
    error: null,
  })
}
