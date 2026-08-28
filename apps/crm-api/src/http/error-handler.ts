import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { CrmHttpError } from './errors.js'

/**
 * The single translation from a thrown value to a client-safe `{ data, error }`
 * response. It lives here rather than inline in `application.ts` so a
 * router-level test can mount the real thing and assert the real status code,
 * instead of asserting against Express's default HTML error page.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof ZodError)
    return res.status(422).json({
      data: null,
      error: {
        code: 'crm/invalid-request',
        message: error.issues[0]?.message ?? 'Invalid request.',
      },
    })

  // A registered error is part of the contract: answer with its own status
  // and code rather than flattening an expected state into a 500.
  if (error instanceof CrmHttpError)
    return res.status(error.httpStatus).json({
      data: null,
      error: { code: error.code, message: error.message },
    })

  console.error(error)
  return res.status(500).json({
    data: null,
    error: { code: 'crm/internal', message: 'Internal server error.' },
  })
}

/** The terminal 404 for a path no router claimed. */
export function notFoundHandler(_req: Request, res: Response) {
  return res.status(404).json({
    data: null,
    error: { code: 'crm/not-found', message: 'Not found.' },
  })
}
