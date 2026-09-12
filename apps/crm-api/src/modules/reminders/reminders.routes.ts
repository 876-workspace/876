import { Router } from 'express'

import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as controller from './reminders.controller.js'

export function createRemindersRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listReminders)
  router.post('/', requireInternalOrServiceApp, controller.createReminder)
  router.patch('/:reminderId', requireInternalOrServiceApp, controller.updateReminder)
  router.delete('/:reminderId', requireInternalOrServiceApp, controller.deleteReminder)

  return router
}
