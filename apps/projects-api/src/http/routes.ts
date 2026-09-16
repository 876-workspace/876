import { Router } from 'express'

import { createCalendarRouter } from '../modules/calendar/calendar.routes.js'
import { createTimeRouter } from '../modules/time/time.routes.js'
import { createIssuesRouter } from '../modules/issues/issues.routes.js'
import { createLabelsRouter } from '../modules/labels/labels.routes.js'
import { createProjectsRouter } from '../modules/projects/projects.routes.js'
import { createTenantsRouter } from '../modules/tenants/tenants.routes.js'
import { createWorkStructureRouter } from '../modules/work-structure/work-structure.routes.js'

export function buildRoutes() {
  const router = Router()
  router.use('/v1/tenants', createTenantsRouter())
  router.use(
    '/v1/organizations/:organizationId/projects',
    createProjectsRouter()
  )
  router.use('/v1/organizations/:organizationId/issues', createIssuesRouter())
  router.use('/v1/organizations/:organizationId/labels', createLabelsRouter())
  router.use('/v1/organizations/:organizationId', createCalendarRouter())
  router.use('/v1/organizations/:organizationId', createTimeRouter())
  router.use('/v1/organizations/:organizationId', createWorkStructureRouter())

  return router
}
