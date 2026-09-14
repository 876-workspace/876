import type { ErrorRequestHandler, RequestHandler } from 'express'
import { sendCommerceError } from './errors.js'
import { getLogger } from '../platform/logger.js'

const log = getLogger('error-handler')
export const notFoundHandler: RequestHandler = (_req, res) =>
  sendCommerceError(res, 'commerce/not-found')
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  void next
  log.error(
    { err: error, requestId: req.header('x-request-id') },
    'request_failed'
  )

  return sendCommerceError(res, 'commerce/internal-error')
}
