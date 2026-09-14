import compression from 'compression'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { errorHandler, notFoundHandler } from './http/error-handler.js'
import { requestContext } from './http/middleware/request-context.js'

export function createApp(): Express {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(helmet())
  app.use(cors({ origin: false }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(compression({ threshold: 1024 }))
  app.use(requestContext)
  app.get('/health', (_req, res) =>
    res.json({ data: { status: 'ok', service: 'commerce-api' }, error: null })
  )
  app.get('/ready', (_req, res) =>
    res.json({ data: { status: 'ok', service: 'commerce-api' }, error: null })
  )
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
