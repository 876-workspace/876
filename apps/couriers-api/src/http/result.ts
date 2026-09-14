import { isError, toAppError } from '@876/core'
import type { Response } from 'express'

export function sendAppResult(
  res: Response,
  result: unknown,
  successStatus = 200
): Response {
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.status(successStatus).json(result)
}
