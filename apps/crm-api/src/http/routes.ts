import { Router } from 'express'

import { createCategoriesRouter } from '../modules/categories/categories.routes.js'
import { createCustomersRouter } from '../modules/customers/customers.routes.js'
import { createPrioritiesRouter } from '../modules/priorities/index.js'
import { createRequestFormsRouter } from '../modules/request-forms/request-forms.routes.js'
import {
  createOperatorRequestsRouter,
  createRequestsRouter,
} from '../modules/requests/requests.routes.js'
import { createTeamsRouter } from '../modules/teams/teams.routes.js'
import { createTenantsRouter } from '../modules/tenants/tenants.routes.js'

export function buildRoutes() {
  const router = Router()
  router.use('/v1/tenants', createTenantsRouter())
  router.use('/v1/requests', createOperatorRequestsRouter())
  router.use(
    '/v1/organizations/:organizationId/customers',
    createCustomersRouter()
  )
  router.use('/v1/organizations/:organizationId/teams', createTeamsRouter())
  router.use(
    '/v1/organizations/:organizationId/request-priorities',
    createPrioritiesRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/request-categories',
    createCategoriesRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/request-forms',
    createRequestFormsRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/requests',
    createRequestsRouter()
  )

  return router
}
