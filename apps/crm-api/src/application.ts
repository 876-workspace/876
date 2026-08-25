import compression from 'compression'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import { ZodError } from 'zod'

import { buildRoutes } from './http/routes.js'

export function createApp(): Express {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', true)
  app.use(helmet())
  app.use(cors({ origin: false }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(compression({ threshold: 1024 }))
  app.get('/health', (_req, res) => res.json({ data: { status: 'ok', service: 'crm-api' } }))
  app.use(buildRoutes())
  app.use((_req, res) => res.status(404).json({ error: 'Not found.', code: 'crm/not-found' }))
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError)
      return res.status(422).json({ error: error.issues[0]?.message ?? 'Invalid request.', code: 'crm/invalid-request' })
    console.error(error)
    return res.status(500).json({ error: 'Internal server error.', code: 'crm/internal' })
  })
  return app
}
