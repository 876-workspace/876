import type { GuardResolver } from '../../http/api-router.js'
import { createApiRouter } from '../../http/api-router.js'
import * as controller from './task-lists.controller.js'

export function createTaskListsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view'],
    },
    handler: controller.listTaskLists,
  })
  api.post({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.create'],
    },
    handler: controller.createTaskList,
  })
  api.get({
    path: '/:listId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view'],
    },
    handler: controller.retrieveTaskList,
  })
  api.patch({
    path: '/:listId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit'],
    },
    handler: controller.updateTaskList,
  })
  api.delete({
    path: '/:listId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.delete'],
    },
    handler: controller.deleteTaskList,
  })
  return api.router
}
