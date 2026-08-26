import compression from 'compression'
import cors from 'cors'
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import helmet from 'helmet'
import { ZodError } from 'zod'

import { CrmHttpError } from './http/errors.js'
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
  app.get('/health', (_req, res) =>
    res.json({ data: { status: 'ok', service: 'crm-api' } })
  )
  app.use(buildRoutes())
  app.use((_req, res) =>
    res.status(404).json({ error: 'Not found.', code: 'crm/not-found' })
  )
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof ZodError)
        return res
          .status(422)
          .json({
            error: error.issues[0]?.message ?? 'Invalid request.',
            code: 'crm/invalid-request',
          })
      // A registered error is part of the contract: answer with its own status
      // and code rather than flattening an expected state into a 500.
      if (error instanceof CrmHttpError)
        return res
          .status(error.httpStatus)
          .json({ error: error.message, code: error.code })
      console.error(error)
      return res
        .status(500)
        .json({ error: 'Internal server error.', code: 'crm/internal' })
    }
  )
  return app
}
