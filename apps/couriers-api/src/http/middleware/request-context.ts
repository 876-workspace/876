import type { NextFunction, Request, Response } from 'express'

import { generateId } from '@/platform/ids'
import { getLogger, runWithRequestContext } from '@/platform/logger'

const log = getLogger('http')

export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.header('x-request-id') || generateId('request')
  res.setHeader('x-request-id', requestId)

  runWithRequestContext(requestId, () => {
    const path = req.path
    const start = process.hrtime.bigint()
    log.info({ method: req.method, path }, 'request_started')
    res.on('finish', () => {
      const durationMs = Math.round(
        Number(process.hrtime.bigint() - start) / 1e6
      )
      const fields = {
        method: req.method,
        path,
        status: res.statusCode,
        duration_ms: durationMs,
      }
      if (res.statusCode >= 500) log.error(fields, 'request_completed')
      else if (res.statusCode >= 400) log.warn(fields, 'request_completed')
      else log.info(fields, 'request_completed')
    })
    next()
  })
}
