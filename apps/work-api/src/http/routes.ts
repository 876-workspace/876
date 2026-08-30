import { Router } from 'express'

import {
  createGuardResolver,
  HttpIdentityGateway,
  type AuthRepository,
} from './auth/index.js'
import { activeConnectionAuthorization } from '../modules/connections/index.js'
import { createRemindersRouter } from '../modules/reminders/index.js'
import { createTasksRouter } from '../modules/tasks/index.js'
import { createTenantsRouter } from '../modules/tenants/index.js'
import { tenantAuthorizationByOrganizationId } from '../modules/tenants/index.js'

export function buildRoutes() {
  const router = Router()
  const repository: AuthRepository = {
    tenantByOrganizationId: tenantAuthorizationByOrganizationId,
    activeConnection: activeConnectionAuthorization,
  }
  const resolveGuards = createGuardResolver({
    repository,
    identity: new HttpIdentityGateway(),
  })

  router.use('/v1/tenants', createTenantsRouter(resolveGuards))
  router.use(
    '/v1/organizations/:organizationId/tasks',
    createTasksRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/reminders',
    createRemindersRouter(resolveGuards)
  )
  return router
}
