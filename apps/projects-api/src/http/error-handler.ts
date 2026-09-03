import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { getLogger } from '../platform/logger.js'
import { getError } from './errors.js'

const log = getLogger('http')

/**
 * Terminal exception translation.
 *
 * Expected Projects failures are returned as values before reaching this middleware.
 * This boundary is reserved for validation-library exceptions and genuinely
 * unexpected faults.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  void _next
  if (error instanceof ZodError) {
    const invalid = getError('projects/invalid-request')
    return res.status(invalid.httpStatus).json({
      data: null,
      error: { code: invalid.code, message: invalid.message },
    })
  }

  log.error(
    {
      error_name: error instanceof Error ? error.name : typeof error,
      error_message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    'unhandled_error'
  )
  const internal = getError('projects/internal-error')
  return res.status(internal.httpStatus).json({
    data: null,
    error: { code: internal.code, message: internal.message },
  })
}

export function notFoundHandler(_req: Request, res: Response) {
  const notFound = getError('projects/not-found')
  return res.status(notFound.httpStatus).json({
    data: null,
    error: { code: notFound.code, message: notFound.message },
  })
}
