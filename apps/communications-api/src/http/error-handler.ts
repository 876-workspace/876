import type { NextFunction, Request, Response } from 'express'

import { getLogger } from '../platform/logger.js'
import { getError } from './errors.js'
import { toClientError } from './result.js'

const log = getLogger('http')

export function notFoundHandler(_req: Request, res: Response) {
  const error = getError('communications/not-found')
  return res.status(error.httpStatus).json({
    data: null,
    error: toClientError(error),
  })
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = res.locals.requestId as string | undefined
  log.error({ error, requestId }, 'request_failed')

  const appError = getError('communications/internal-error')
  return res.status(appError.httpStatus).json({
    data: null,
    error: toClientError(appError),
  })
}
