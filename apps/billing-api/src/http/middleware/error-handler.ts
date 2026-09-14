import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { appError, errors, isAppHttpError } from '@/http/errors'
import { getLogger } from '@/platform/logger'

const log = getLogger('http.error')

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) return next(error)
  if (isAppHttpError(error)) {
    const fields = {
      code: error.code,
      path: req.path,
      status: error.httpStatus,
    }
    if (error.httpStatus >= 500)
      log.error({ ...fields, err: error }, 'app_error')
    else log.warn(fields, 'app_client_error')
    res.status(error.httpStatus).json({ error: error.toClientError() })
    return
  }
  if (error instanceof ZodError) {
    const details = error.issues.map(({ path, message, code }) => ({
      loc: path,
      msg: message,
      type: code,
    }))
    const validationError = errors.validation(
      'The request body or parameters failed validation.',
      details
    )
    res
      .status(validationError.httpStatus)
      .json({ error: validationError.toClientError() })
    return
  }
  if (error instanceof SyntaxError && 'body' in error) {
    const validationError = errors.validation(
      'The request body or parameters failed validation.'
    )
    res
      .status(validationError.httpStatus)
      .json({ error: validationError.toClientError() })
    return
  }
  log.error(
    { err: error, path: req.path, method: req.method },
    'request_unhandled_error'
  )
  const internalError = appError('error/unknown')
  res
    .status(internalError.httpStatus)
    .json({ error: internalError.toClientError() })
}

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(appError('error/not-found'))
}
