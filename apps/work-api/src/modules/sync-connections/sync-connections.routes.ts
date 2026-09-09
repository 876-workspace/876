import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import * as controller from './sync-connections.controller.js'

const readSecurity = {
  kind: 'integration' as const,
  scope: 'work.sync.read',
  sessionPermissions: ['calendars.view'] as const,
}
const writeSecurity = {
  kind: 'integration' as const,
  scope: 'work.sync.write',
  sessionPermissions: ['calendars.edit'] as const,
}

export function createSyncConnectionsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)

  api.get({ path: '/', security: readSecurity, handler: controller.listConnections })

  // Generic provider-neutral CRUD remains available to trusted service
  // integrations. Signed-in users must use the authority-owning setup flow.
  api.post({
    path: '/',
    security: { kind: 'integration', scope: 'work.sync.write' },
    handler: controller.createConnection,
  })
  api.post({
    path: '/setup',
    security: writeSecurity,
    handler: controller.setupConnection,
  })

  api.post({
    path: '/:connectionId/authorize',
    security: writeSecurity,
    handler: controller.authorizeConnection,
  })
  api.get({
    path: '/:connectionId/remote-calendars',
    security: readSecurity,
    handler: controller.listRemoteCalendars,
  })
  api.get({
    path: '/:connectionId/calendar-links',
    security: readSecurity,
    handler: controller.listCalendarLinks,
  })
  api.post({
    path: '/:connectionId/calendar-links',
    security: writeSecurity,
    handler: controller.linkCalendar,
  })
  api.delete({
    path: '/:connectionId/calendar-links/:mappingId',
    security: writeSecurity,
    handler: controller.unlinkCalendar,
  })
  api.post({
    path: '/:connectionId/sync',
    security: writeSecurity,
    handler: controller.syncConnection,
  })
  api.post({
    path: '/:connectionId/calendar-links/:mappingId/sync',
    security: writeSecurity,
    handler: controller.syncCalendarLink,
  })

  api.get({
    path: '/:connectionId',
    security: readSecurity,
    handler: controller.retrieveConnection,
  })
  api.patch({
    path: '/:connectionId',
    security: { kind: 'integration', scope: 'work.sync.write' },
    handler: controller.updateConnection,
  })
  api.delete({
    path: '/:connectionId',
    security: writeSecurity,
    handler: controller.deleteConnection,
  })
  return api.router
}
