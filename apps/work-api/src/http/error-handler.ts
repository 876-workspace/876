import { getError, toAppError } from '@876/core'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { getLogger } from '../platform/logger.js'

const log = getLogger('http')

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    const invalid = getError('work/invalid-request')
    return res
      .status(invalid.httpStatus)
      .json({ data: null, error: toAppError(invalid) })
  }

  // The client is told nothing but `work/internal`, so this line is the only
  // record of what actually failed. Without it a 500 is indistinguishable from
  // any other 500 — an unapplied migration, a null dereference, and a dead
  // provider all look identical from outside.
  log.error(
    {
      error_name: error instanceof Error ? error.name : typeof error,
      error_message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    'unhandled_error'
  )

  const internal = getError('work/internal')
  return res
    .status(internal.httpStatus)
    .json({ data: null, error: toAppError(internal) })
}

export function notFoundHandler(_req: Request, res: Response) {
  const notFound = getError('work/not-found')
  return res
    .status(notFound.httpStatus)
    .json({ data: null, error: toAppError(notFound) })
}
