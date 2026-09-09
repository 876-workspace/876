import { Router } from 'express'

import {
  createGuardResolver,
  HttpIdentityGateway,
  type AuthRepository,
} from './auth/index.js'
import { createAlertsRouter } from '../modules/alerts/index.js'
import { createCalendarSubscriptionsRouter } from '../modules/calendar-subscriptions/index.js'
import { createCalendarsRouter } from '../modules/calendars/index.js'
import { activeConnectionAuthorization } from '../modules/connections/index.js'
import { createEventParticipantsRouter } from '../modules/event-participants/index.js'
import { createEventsRouter } from '../modules/events/index.js'
import { createExportsRouter } from '../modules/exports/index.js'
import { createMyWorkRouter } from '../modules/my-work/index.js'
import { createNotificationOutboxRouter } from '../modules/notification-outbox/index.js'
import { createRecurrenceRulesRouter } from '../modules/recurrence-rules/index.js'
import { createRemindersRouter } from '../modules/reminders/index.js'
import { createResourceWorkRouter } from '../modules/resource-work/index.js'
import {
  createSyncConnectionsRouter,
  createSyncOauthRouter,
  createSyncSchedulerRouter,
} from '../modules/sync-connections/index.js'
import { createSyncMappingsRouter } from '../modules/sync-mappings/index.js'
import { createTaskAssignmentsRouter } from '../modules/task-assignments/index.js'
import { createTaskLinksRouter } from '../modules/task-links/index.js'
import { createTaskListsRouter } from '../modules/task-lists/index.js'
import { createTasksRouter } from '../modules/tasks/index.js'
import {
  createTenantsRouter,
  tenantAuthorizationByOrganizationId,
} from '../modules/tenants/index.js'

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

  // OAuth provider callbacks are intentionally public. The single-use hashed
  // state binds the callback to the exact Work connection and provider.
  router.use('/v1/sync/oauth', createSyncOauthRouter())

  router.use('/v1/tenants', createTenantsRouter(resolveGuards))
  router.use(
    '/v1/organizations/:organizationId/task-lists',
    createTaskListsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/tasks/:taskId/links',
    createTaskLinksRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/tasks/:taskId/assignments',
    createTaskAssignmentsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/tasks',
    createTasksRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/reminders',
    createRemindersRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/recurrence-rules',
    createRecurrenceRulesRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/alerts',
    createAlertsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/calendars/:calendarId/subscriptions',
    createCalendarSubscriptionsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/calendars',
    createCalendarsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/events/:eventId/participants',
    createEventParticipantsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/events',
    createEventsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/my-work',
    createMyWorkRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/resource-work',
    createResourceWorkRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/sync-connections/:connectionId/mappings',
    createSyncMappingsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/sync-connections',
    createSyncConnectionsRouter(resolveGuards)
  )
  router.use(
    '/v1/organizations/:organizationId/exports',
    createExportsRouter(resolveGuards)
  )
  router.use(
    '/v1/internal/notifications',
    createNotificationOutboxRouter(resolveGuards)
  )
  router.use('/v1/internal/sync', createSyncSchedulerRouter(resolveGuards))
  return router
}
