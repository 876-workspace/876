import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodType, z } from 'zod'

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
  // `namespace` is the only way to augment Express's Request type. The config
  // registers the TypeScript parser but not the plugin that owns no-namespace,
  // so disabling that rule here would reference a rule ESLint cannot resolve.
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
    if (schemas.query) req.valid.query = schemas.query.parse(req.query)
    next()
  }
}

export function validBody<T>(req: Request): T {
  return req.valid.body as T
}
export function validQuery<T>(req: Request): T {
  return req.valid.query as T
}
export function validParams<T>(req: Request): T {
  return req.valid.params as T
}
