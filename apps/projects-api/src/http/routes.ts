import { Router } from 'express'

import { createProjectsRouter } from '../modules/projects/projects.routes.js'
import { createTenantsRouter } from '../modules/tenants/tenants.routes.js'

export function buildRoutes() {
  const router = Router()
  router.use('/v1/tenants', createTenantsRouter())
  router.use(
    '/v1/organizations/:organizationId/projects',
    createProjectsRouter()
  )

  return router
}
