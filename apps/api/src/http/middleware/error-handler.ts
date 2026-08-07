import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { AppHttpError, isAppHttpError } from '@/http/errors'
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
    res.status(422).json({
      data: null,
      error: {
        code: 'request/invalid',
        message: first?.message ?? 'Invalid request.',
        ...(first?.path.length ? { param: first.path.join('.') } : {}),
      },
    })
    return
  }

  // A malformed JSON body surfaces as a SyntaxError from express.json().
  if (
    error instanceof SyntaxError &&
    'body' in error &&
    typeof (error as { status?: number }).status === 'number'
  ) {
    res.status(400).json({
      data: null,
      error: {
        code: 'request/invalid-json',
        message: 'Request body is not valid JSON.',
      },
    })
    return
  }

  // Anything unrecognized is a bug. Log it in full, tell the client nothing —
  // a stack trace, a SQL string, or a provider payload must never leave here.
  log.error(
    { err: error, path: req.path, method: req.method },
    'request_unhandled_error'
  )
  res.status(500).json({
    data: null,
    error: { code: 'auth/internal-error', message: 'Internal error.' },
  })
}

/** 404 for an unmatched route. Registered after all routers, before the error handler. */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(
    new AppHttpError({
      code: 'error/not-found',
      message: `Cannot ${req.method} ${req.path}`,
      httpStatus: 404,
    })
  )
}
