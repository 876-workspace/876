import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'

import { getSettings } from '@/config'
import { envelope } from '@/http/middleware/envelope'
import { errorHandler, notFoundHandler } from '@/http/middleware/error-handler'
import { metrics } from '@/http/middleware/metrics'
import { captureRawJson } from '@/http/middleware/raw-body'
import { requestContext } from '@/http/middleware/request-context'
import { writerLease } from '@/http/middleware/writer'
import { buildOpenApiDocument } from '@/http/openapi/registry'
import { buildRoutes } from '@/http/routes'

export function createApp(): Express {
  const settings = getSettings()
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(helmet())
  app.use(
    cors({
      origin: settings.corsOrigins,
      credentials: true,
      methods: ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
      allowedHeaders: [
        'Authorization',
        'Content-Type',
        'Idempotency-Key',
        'X-876-API-Key',
        'X-Billing-Organization-Id',
        'X-Internal-Key',
        'X-Request-Id',
        'X-Scheduler-Key',
      ],
      exposedHeaders: ['x-billing-writer', 'x-request-id'],
    })
  )
  app.use(requestContext)
  app.use(metrics)
  app.use(express.json({ limit: '1mb', verify: captureRawJson }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(compression({ threshold: 1024 }))
  app.use(envelope)
  app.use(writerLease)

  app.get('/openapi.json', (_req, res) => {
    res.json(
      buildOpenApiDocument({
        registry: 'public',
        identityApiUrl: settings.identityApiUrl,
      })
    )
  })
  app.get('/internal/openapi.json', (_req, res) => {
    res.json(
      buildOpenApiDocument({
        registry: 'internal',
        identityApiUrl: settings.identityApiUrl,
      })
    )
  })
  app.use(buildRoutes())
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
