import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import * as controller from './tasks.controller.js'

export function createTasksRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view'],
    },
    handler: controller.listTasks,
  })
  api.post({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.create'],
    },
    handler: controller.createTask,
  })
  api.get({
    path: '/:taskId/recurrence',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view'],
    },
    handler: controller.retrieveTaskRecurrence,
  })
  api.patch({
    path: '/:taskId/recurrence',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit'],
    },
    handler: controller.setTaskRecurrence,
  })
  api.delete({
    path: '/:taskId/recurrence',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit'],
    },
    handler: controller.clearTaskRecurrence,
  })
  api.get({
    path: '/:taskId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.read',
      sessionPermissions: ['tasks.view'],
    },
    handler: controller.retrieveTask,
  })
  api.patch({
    path: '/:taskId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.edit'],
    },
    handler: controller.updateTask,
  })
  api.delete({
    path: '/:taskId',
    security: {
      kind: 'integration',
      scope: 'work.tasks.write',
      sessionPermissions: ['tasks.delete'],
    },
    handler: controller.deleteTask,
  })
  return api.router
}
