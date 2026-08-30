import { Router } from 'express'

import { createRemindersRouter } from '../modules/reminders/index.js'
import { createTasksRouter } from '../modules/tasks/index.js'
import { createTenantsRouter } from '../modules/tenants/index.js'

export function buildRoutes() {
  const router = Router()
  router.use('/v1/tenants', createTenantsRouter())
  router.use(
    '/v1/organizations/:organizationId/tasks',
    createTasksRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/reminders',
    createRemindersRouter()
  )
  return router
}
