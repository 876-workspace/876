import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { appError, isAppHttpError } from '@/http/errors'
import { getLogger } from '@/platform/logger'

const log = getLogger('http.error')

/**
 * The terminal error middleware. Must be registered last.
 *
 * Express 5 routes a rejected promise from an async handler here automatically,
 * which is why handlers throw instead of calling `next(err)`.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Headers already sent means the response is mid-flight; Express's default
  // handler is the only thing that can close it correctly.
  if (res.headersSent) return next(error)

  if (isAppHttpError(error)) {
    if (error.httpStatus >= 500) {
      log.error(
        { err: error, code: error.code, path: req.path },
        'request_error'
      )
    }
    res
      .status(error.httpStatus)
      .json({ data: null, error: error.toClientError() })
    return
  }

  if (error instanceof ZodError) {
    const first = error.issues[0]
    // Field-specific validation text stays in the message; code, status, and
    // param routing always come from the registry.
    const validationError = appError(
      'request/invalid',
      first?.message ? { message: first.message } : undefined
    )
    const body = validationError.toClientError()
    if (first?.path.length) body.param = first.path.join('.')
    res.status(validationError.httpStatus).json({ data: null, error: body })
    return
  }

  // A malformed JSON body surfaces as a SyntaxError from express.json().
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

  // Anything unrecognized is a bug. Log it in full, tell the client nothing —
  // a stack trace, a SQL string, or a provider payload must never leave here.
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

/** 404 for an unmatched route. Registered after all routers, before the error handler. */
export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(appError('error/not-found'))
}
