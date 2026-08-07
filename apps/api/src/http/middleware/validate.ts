import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodType, z } from 'zod'

/**
 * Request validation.
 *
 * Validation happens here and nowhere else — a controller reads
 * `req.valid.body` and never re-parses raw input
 * (.claude/rules/express-api.md).
 */

/**
 * `params` and `query` are constrained to object schemas because OpenAPI models
 * them as named parameters — a bare scalar has nowhere to hang a name. `body`
 * stays open, since a few endpoints post a non-object payload.
 */
export type ValidationSchemas = {
  body?: ZodType
  query?: z.ZodObject
  params?: z.ZodObject
}

export type Validated<S extends ValidationSchemas> = {
  body: S['body'] extends ZodType ? z.infer<S['body']> : undefined
  query: S['query'] extends z.ZodObject ? z.infer<S['query']> : undefined
  params: S['params'] extends z.ZodObject ? z.infer<S['params']> : undefined
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      valid: { body?: unknown; query?: unknown; params?: unknown }
    }
  }
}

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.valid ??= {}

    if (schemas.params) req.valid.params = schemas.params.parse(req.params)
    if (schemas.body) req.valid.body = schemas.body.parse(req.body)
    // Express 5 makes req.query a getter returning a fresh object, so the
    // parsed result is stored on req.valid rather than assigned back.
    if (schemas.query) req.valid.query = schemas.query.parse(req.query)

    next()
  }
}

/** Typed accessors, so a controller reads validated input without a cast at each use. */
export function validBody<T>(req: Request): T {
  return req.valid.body as T
}

export function validQuery<T>(req: Request): T {
  return req.valid.query as T
}

export function validParams<T>(req: Request): T {
  return req.valid.params as T
}
