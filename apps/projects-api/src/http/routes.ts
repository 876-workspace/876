import { Router } from 'express'

import { createIssuesRouter } from '../modules/issues/issues.routes.js'
import { createLabelsRouter } from '../modules/labels/labels.routes.js'
import { createProjectsRouter } from '../modules/projects/projects.routes.js'
import { createTenantsRouter } from '../modules/tenants/tenants.routes.js'

export function buildRoutes() {
  const router = Router()
  router.use('/v1/tenants', createTenantsRouter())
  router.use(
    '/v1/organizations/:organizationId/projects',
    createProjectsRouter()
  )
  router.use('/v1/organizations/:organizationId/issues', createIssuesRouter())
  router.use('/v1/organizations/:organizationId/labels', createLabelsRouter())

  return router
}
