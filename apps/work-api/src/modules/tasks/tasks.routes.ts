import type { GuardResolver } from '../../http/api-router.js'
import { createApiRouter } from '../../http/api-router.js'
import * as controller from './tasks.controller.js'

export function createTasksRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: { kind: 'integration', scope: 'work.tasks.read' },
    handler: controller.listTasks,
  })
  api.post({
    path: '/',
    security: { kind: 'integration', scope: 'work.tasks.write' },
    handler: controller.createTask,
  })
  api.get({
    path: '/:taskId',
    security: { kind: 'integration', scope: 'work.tasks.read' },
    handler: controller.retrieveTask,
  })
  api.patch({
    path: '/:taskId',
    security: { kind: 'integration', scope: 'work.tasks.write' },
    handler: controller.updateTask,
  })
  api.delete({
    path: '/:taskId',
    security: { kind: 'integration', scope: 'work.tasks.write' },
    handler: controller.deleteTask,
  })
  return api.router
}
