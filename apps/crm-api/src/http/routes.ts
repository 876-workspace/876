import { Router } from 'express'

import { createCustomersRouter } from '../modules/customers/customers.routes.js'
import { createRequestsRouter } from '../modules/requests/requests.routes.js'
import { createTenantsRouter } from '../modules/tenants/tenants.routes.js'

export function buildRoutes() {
  const router = Router()
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
