import {
  getError,
  isError,
  toAppError,
  type Error as AppErrorValue,
  type WorkErrorCode,
} from '@876/core'
import type { Response } from 'express'

export function sendWorkError(res: Response, code: WorkErrorCode) {
  const error = getError(code)
  return res
    .status(error.httpStatus)
    .json({ data: null, error: toAppError(error) })
}

export function sendWorkResult<T>(
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

export function sendWorkList<T>(
  res: Response,
  result: T[] | AppErrorValue,
  url: string
) {
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.json({
    data: {
      object: 'list',
      data: result,
      has_more: false,
      total_count: result.length,
      url,
    },
    error: null,
  })
}
