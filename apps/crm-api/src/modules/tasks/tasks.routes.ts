import { Router } from 'express'

import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as controller from './tasks.controller.js'

export function createTasksRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listTasks)
  router.post('/', requireInternalOrServiceApp, controller.createTask)
  router.patch('/:taskId', requireInternalOrServiceApp, controller.updateTask)
  router.delete('/:taskId', requireInternalOrServiceApp, controller.deleteTask)

  return router
}
