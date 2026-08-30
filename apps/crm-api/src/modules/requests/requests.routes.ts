import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import { createEventsRouter } from '../events/index.js'
import { createNotesRouter } from '../notes/index.js'
import { createRemindersRouter } from '../reminders/index.js'
import { createTasksRouter } from '../tasks/index.js'
import * as controller from './requests.controller.js'

export function createRequestsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listRequests)
  router.post('/', requireInternal, controller.createRequest)
  router.get('/:id', requireInternal, controller.retrieveRequest)
  router.patch('/:id', requireInternal, controller.updateRequest)
  router.delete('/:id', requireInternal, controller.deleteRequest)

  router.use('/:id/notes', createNotesRouter())
  router.use('/:id/tasks', createTasksRouter())
  router.use('/:id/reminders', createRemindersRouter())
  router.use('/:id/events', createEventsRouter())

  return router
}
