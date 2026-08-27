import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './requests.controller.js'

export function createRequestsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listRequests)
  router.post('/', requireInternal, controller.createRequest)
  router.get('/:id', requireInternal, controller.retrieveRequest)
  router.patch('/:id', requireInternal, controller.updateRequest)
  router.delete('/:id', requireInternal, controller.deleteRequest)

  router.get('/:id/notes', requireInternal, controller.listRequestNotes)
  router.post('/:id/notes', requireInternal, controller.createRequestNote)
  router.delete(
    '/:id/notes/:noteId',
    requireInternal,
    controller.deleteRequestNote
  )
  router.patch(
    '/:id/notes/:noteId',
    requireInternal,
    controller.updateRequestNote
  )
  router.get('/:id/tasks', requireInternal, controller.listTasks)
  router.post('/:id/tasks', requireInternal, controller.createTask)
  router.patch('/:id/tasks/:taskId', requireInternal, controller.updateTask)
  router.delete('/:id/tasks/:taskId', requireInternal, controller.deleteTask)
  router.get('/:id/reminders', requireInternal, controller.listReminders)
  router.post('/:id/reminders', requireInternal, controller.createReminder)
  router.patch(
    '/:id/reminders/:reminderId',
    requireInternal,
    controller.updateReminder
  )
  router.delete(
    '/:id/reminders/:reminderId',
    requireInternal,
    controller.deleteReminder
  )

  return router
}
