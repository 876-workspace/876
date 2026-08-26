import { Router, type NextFunction, type Request, type Response } from 'express'

import { createCustomersRouter } from '../modules/customers/customers.routes.js'
import { createRequestsRouter } from '../modules/requests/requests.routes.js'
import { createTenantsRouter } from '../modules/tenants/tenants.routes.js'

function requireInternal(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.CRM_INTERNAL_KEY
  const provided = req.header('x-internal-key')
  if (!expected || !provided || provided !== expected)
    return res.status(401).json({
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    })

  next()
}

export function buildRoutes() {
  const router = Router()
  router.use(requireInternal)
  router.use('/v1/tenants', createTenantsRouter())
  router.use(
    '/v1/organizations/:organizationId/customers',
    createCustomersRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/requests',
    createRequestsRouter()
  )

  return router
}
