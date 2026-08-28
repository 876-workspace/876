import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './reminders.controller.js'

export function createRemindersRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listReminders)
  router.post('/', requireInternal, controller.createReminder)
  router.patch('/:reminderId', requireInternal, controller.updateReminder)
  router.delete('/:reminderId', requireInternal, controller.deleteReminder)

  return router
}
