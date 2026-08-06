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

/**
 * Assembles the Express application. Never calls `listen` — `server.ts` owns
 * that, and tests import this to drive the real middleware chain with
 * supertest rather than calling controllers directly.
 */
export function createApp(): Express {
  const settings = getSettings()
  const app = express()

  // Reduce fingerprinting (expressjs.com → security best practices).
  app.disable('x-powered-by')
  // The service runs behind the Cloudflare Container front door, so the client
  // IP that rate limiting and audit logging record comes from the proxy chain.
  app.set('trust proxy', true)

  app.use(helmet())
  app.use(
    cors({
      origin: settings.corsOrigins,
      credentials: true,
      // Every header an app bridge, the SDK, or an OIDC client may present.
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-876-API-Key',
        'X-API-Key',
        'x-internal-key',
        'x-request-id',
        'X-876-Realm',
        'X-876-Origin',
      ],
      exposedHeaders: ['x-request-id'],
    })
  )

  app.use(requestContext)
  // A bounded body size, always — an unbounded parser is a denial-of-service
  // surface on every route at once.
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
