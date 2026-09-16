import { randomUUID } from 'node:crypto'

import type { NextFunction, Request, Response } from 'express'

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('x-request-id')?.trim() || randomUUID()
  res.locals.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
}
