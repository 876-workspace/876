import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import { retrieveResourceWork } from './resource-work.controller.js'

export function createResourceWorkRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.resource-work.read',
      sessionPermissions: ['tasks.view', 'reminders.view', 'events.view'],
      sessionPermissionsMode: 'all',
    },
    handler: retrieveResourceWork,
  })
  return api.router
}
