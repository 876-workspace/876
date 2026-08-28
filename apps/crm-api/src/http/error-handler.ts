import { getError, toAppError } from '@876/core'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { CrmHttpError } from './errors.js'

/**
 * Terminal exception translation. Expected CRM failures should be returned as
 * values by service/route code; this remains the safety boundary for Zod and
 * unexpected exceptions while legacy throw sites are removed.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError) {
    const invalid = getError('crm/invalid-request')

    return res
      .status(invalid.httpStatus)
      .json({ data: null, error: toAppError(invalid) })
  }

  if (error instanceof CrmHttpError)
    return res.status(error.httpStatus).json({
      data: null,
      error: { code: error.code, message: error.message },
    })

  console.error(error)
  const internal = getError('crm/internal')

  return res
    .status(internal.httpStatus)
    .json({ data: null, error: toAppError(internal) })
}

/** The terminal 404 for a path no router claimed. */
export function notFoundHandler(_req: Request, res: Response) {
  const notFound = getError('crm/not-found')

  return res
    .status(notFound.httpStatus)
    .json({ data: null, error: toAppError(notFound) })
}
