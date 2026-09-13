import type { RequestHandler } from 'express'
import { randomUUID } from 'node:crypto'
export const requestContext: RequestHandler = (req, res, next) => {
  const requestId = req.header('x-request-id') ?? randomUUID()
  res.setHeader('x-request-id', requestId)
  next()
}
