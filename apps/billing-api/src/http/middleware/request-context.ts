import type { NextFunction, Request, Response } from 'express'

import { generateId } from '@/platform/ids'
import { getLogger, runWithRequestContext } from '@/platform/logger'

const log = getLogger('http')

export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.header('x-request-id') || generateId('req')
  res.setHeader('x-request-id', requestId)
  runWithRequestContext(requestId, () => {
    const started = process.hrtime.bigint()
    const path = req.path
    log.info({ method: req.method, path }, 'request_started')
    res.on('finish', () => {
      const fields = {
        method: req.method,
        path,
        status: res.statusCode,
        duration_ms: Math.round(
          Number(process.hrtime.bigint() - started) / 1e6
        ),
      }
      if (res.statusCode >= 500) log.error(fields, 'request_completed')
      else if (res.statusCode >= 400) log.warn(fields, 'request_completed')
      else log.info(fields, 'request_completed')
    })
    next()
  })
}
