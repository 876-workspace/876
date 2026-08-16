import type { NextFunction, Request, Response } from 'express'

import { getSettings } from '@/config'
import { errors } from '@/http/errors'
import { recordWriterRejection } from '@/platform/metrics'

const unsafeMethods = new Set(['DELETE', 'PATCH', 'POST', 'PUT'])

export function writerLease(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const writer = getSettings().billingWriter
  res.setHeader('x-billing-writer', writer)
  const isV1 = req.path === '/api/v1' || req.path.startsWith('/api/v1/')
  if (isV1 && unsafeMethods.has(req.method) && writer !== 'express') {
    recordWriterRejection()
    next(errors.writerInactive(writer))
    return
  }
  next()
}
