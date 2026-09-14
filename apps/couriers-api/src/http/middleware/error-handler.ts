import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { appError, isAppHttpError } from '@/http/errors'
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
    if (error.httpStatus >= 500)
      log.error(
        { err: error, code: error.code, path: req.path },
        'request_error'
      )
    res
      .status(error.httpStatus)
      .json({ data: null, error: error.toClientError() })
    return
  }

  if (error instanceof ZodError) {
    const first = error.issues[0]
    // Field-specific validation text stays in the message, matching the Core
    // API terminal handler. Code and status always come from the registry.
    const validationError = appError(
      'request/invalid',
      first?.message ? { message: first.message } : undefined
    )
    res.status(validationError.httpStatus).json({
      data: null,
      error: validationError.toClientError(),
    })
    return
  }

  if (
    error instanceof SyntaxError &&
    'body' in error &&
    typeof (error as { status?: number }).status === 'number'
  ) {
    const jsonError = appError('request/invalid-json')
    res.status(jsonError.httpStatus).json({
      data: null,
      error: jsonError.toClientError(),
    })
    return
  }

  log.error(
    { err: error, path: req.path, method: req.method },
    'request_unhandled_error'
  )
  const internalError = appError('auth/internal-error')
  res.status(internalError.httpStatus).json({
    data: null,
    error: internalError.toClientError(),
  })
}

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(appError('error/not-found'))
}
