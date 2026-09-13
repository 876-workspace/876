import type { ErrorRequestHandler, RequestHandler } from 'express'
import { getLogger } from '../platform/logger.js'

const log = getLogger('error-handler')
export const notFoundHandler: RequestHandler = (req, res) =>
  res.status(404).json({
    data: null,
    error: {
      code: 'commerce/not-found',
      message: `No route for ${req.method} ${req.path}.`,
    },
  })
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  void next
  log.error({ err: error, requestId: req.header('x-request-id') }, 'request_failed')

  return res.status(500).json({
    data: null,
    error: {
      code: 'commerce/internal-error',
      message: 'An unexpected error occurred.',
    },
  })
}
