import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './tasks.controller.js'

export function createTasksRouter() {
  const router = Router({ mergeParams: true })
  router.get('/', requireInternal, controller.listTasks)
  router.post('/', requireInternal, controller.createTask)
  router.patch('/:taskId', requireInternal, controller.updateTask)
  router.delete('/:taskId', requireInternal, controller.deleteTask)
  return router
}
