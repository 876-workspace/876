import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodType, z } from 'zod'

export type ValidationSchemas = {
  body?: ZodType
  query?: z.ZodObject
  params?: z.ZodObject
}

const validated = new WeakMap<
  Request,
  { body?: unknown; query?: unknown; params?: unknown }
>()

export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value: { body?: unknown; query?: unknown; params?: unknown } = {}
    if (schemas.params) value.params = schemas.params.parse(req.params)
    if (schemas.body) value.body = schemas.body.parse(req.body)
    if (schemas.query) value.query = schemas.query.parse(req.query)
    validated.set(req, value)
    next()
  }
}

export function validBody<T>(req: Request): T {
  return validated.get(req)?.body as T
}

export function validQuery<T>(req: Request): T {
  return validated.get(req)?.query as T
}

export function validParams<T>(req: Request): T {
  return validated.get(req)?.params as T
}
