import { getError, toAppError } from '@876/core'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

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

  console.error(error)
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
