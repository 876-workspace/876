import type { NextFunction, Request, Response } from 'express'

import { generateId } from '@/platform/ids'
import { getLogger, runWithRequestContext } from '@/platform/logger'

const log = getLogger('http')

/**
 * Bind a request ID to the async context, log the request lifecycle, and echo
 * the ID back on the response.
 *
 * An inbound `x-request-id` is honoured so a trace started by a Next.js app or
 * by Cloudflare survives the hop into this service.
 */
export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = req.header('x-request-id') || generateId('request')
  res.setHeader('x-request-id', requestId)

  runWithRequestContext(requestId, () => {
    // `req.path` excludes the query string. Authorization codes, invite tokens,
    // and OTPs travel as query parameters and must never reach the logs.
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
