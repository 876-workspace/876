import { Router } from 'express'

import { createCalendarRouter } from '../modules/calendar/calendar.routes.js'
import { createFinanceRouter } from '../modules/finance/finance.routes.js'
import { createReportsRouter } from '../modules/reports/reports.routes.js'
import { createTimeRouter } from '../modules/time/time.routes.js'
import { createIssuesRouter } from '../modules/issues/issues.routes.js'
import { createLabelsRouter } from '../modules/labels/labels.routes.js'
import { createAutomationRouter } from '../modules/automation/automation.routes.js'
import { createCustomModulesRouter } from '../modules/custom-modules/index.js'
import { createLayoutsRouter } from '../modules/layouts/layouts.routes.js'
import { createProjectsRouter } from '../modules/projects/projects.routes.js'
import { createTenantsRouter } from '../modules/tenants/tenants.routes.js'
import { createWorkStructureRouter } from '../modules/work-structure/work-structure.routes.js'
import {
  createProjectCustomFieldsRouter,
  createProjectCustomFieldValuesRouter,
} from '../modules/custom-fields/index.js'
import { createTemplatesRouter } from '../modules/templates/templates.routes.js'
import { createAutomationInternalRouter } from '../modules/automation/automation.internal-routes.js'
import { createWorkflowsRouter } from '../modules/workflows/workflows.routes.js'
import { createActivityRouter } from '../modules/collaboration/activity.routes.js'
import { createFollowersRouter } from '../modules/collaboration/followers.routes.js'
import { createDiscussionsRouter } from '../modules/discussions/discussions.routes.js'
import { createWikiRouter } from '../modules/wiki/wiki.routes.js'
import {
  createAttachmentLinksRouter,
  createClientGrantsRouter,
} from '../modules/portal/index.js'
import { createPortalRouter } from '../modules/portal/portal.routes.js'

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
  router.use('/v1/organizations/:organizationId', createFinanceRouter())
  router.use('/v1/organizations/:organizationId', createReportsRouter())
  router.use('/v1/organizations/:organizationId', createWorkStructureRouter())
  router.use('/v1/organizations/:organizationId', createProjectCustomFieldsRouter())
  router.use('/v1/organizations/:organizationId', createLayoutsRouter())
  router.use('/v1/organizations/:organizationId', createCustomModulesRouter())
  router.use(
    '/v1/organizations/:organizationId/projects',
    createProjectCustomFieldValuesRouter()
  )
  router.use('/v1/organizations/:organizationId', createTemplatesRouter())
  router.use('/v1/organizations/:organizationId', createAutomationRouter())
  router.use('/v1/organizations/:organizationId', createWorkflowsRouter())
  router.use('/v1/organizations/:organizationId/followers', createFollowersRouter())
  router.use(
    '/v1/organizations/:organizationId/projects',
    createActivityRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/projects/:projectId/discussions',
    createDiscussionsRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/projects/:projectId/wiki',
    createWikiRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/projects/:projectId/client-grants',
    createClientGrantsRouter()
  )
  router.use(
    '/v1/organizations/:organizationId/projects/:projectId/attachment-links',
    createAttachmentLinksRouter()
  )
  router.use(
    '/portal/organizations/:organizationId/projects/:projectId',
    createPortalRouter()
  )
  router.use('/internal', createAutomationInternalRouter())

  return router
}
