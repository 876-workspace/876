import type { GuardResolver } from '../../http/api-router.js'
import { createApiRouter } from '../../http/api-router.js'
import * as controller from './task-links.controller.js'

export function createTaskLinksRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view'],
    },
    handler: controller.listTaskLinks,
  })
  api.post({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit'],
    },
    handler: controller.createTaskLink,
  })
  api.delete({
    path: '/:linkId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit'],
    },
    handler: controller.deleteTaskLink,
  })
  return api.router
}
