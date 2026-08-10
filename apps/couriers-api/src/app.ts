import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'

import { getSettings } from '@/config'
import { errorHandler, notFoundHandler } from '@/http/middleware/error-handler'
import { envelope } from '@/http/middleware/envelope'
import { requestContext } from '@/http/middleware/request-context'
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
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-876-API-Key',
        'X-API-Key',
        'x-couriers-integration-key',
        'x-internal-key',
        'x-request-id',
      ],
      exposedHeaders: ['x-request-id'],
    })
  )

  app.use(requestContext)
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(compression({ threshold: 1024 }))
  app.use(envelope)

  app.get('/openapi.json', (_req, res) => {
    res.json(
      buildOpenApiDocument({
        version: '0.1.0',
        serverUrl: `http://localhost:${settings.port}`,
      })
    )
  })

  app.use(buildRoutes())

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
