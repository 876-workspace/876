import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { AppHttpError, isAppHttpError } from '@/http/errors'
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
    res.status(422).json({
      data: null,
      error: {
        code: 'request/invalid',
        message: first?.message ?? 'Invalid request.',
      },
    })
    return
  }

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

  log.error(
    { err: error, path: req.path, method: req.method },
    'request_unhandled_error'
  )
  res.status(500).json({
    data: null,
    error: { code: 'auth/internal-error', message: 'Internal error.' },
  })
}

export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next(
    new AppHttpError({
      code: 'error/not-found',
      message: 'Not found.',
      httpStatus: 404,
    })
  )
}
