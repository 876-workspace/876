import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import * as controller from './reminders.controller.js'

export function createRemindersRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)
  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.reminders.read',
      sessionPermissions: ['reminders.view'],
    },
    handler: controller.listReminders,
  })
  api.post({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.reminders.write',
      sessionPermissions: ['reminders.create'],
    },
    handler: controller.createReminder,
  })
  api.get({
    path: '/:reminderId',
    security: {
      kind: 'integration',
      scope: 'work.reminders.read',
      sessionPermissions: ['reminders.view'],
    },
    handler: controller.retrieveReminder,
  })
  api.patch({
    path: '/:reminderId',
    security: {
      kind: 'integration',
      scope: 'work.reminders.write',
      sessionPermissions: ['reminders.edit'],
    },
    handler: controller.updateReminder,
  })
  api.delete({
    path: '/:reminderId',
    security: {
      kind: 'integration',
      scope: 'work.reminders.write',
      sessionPermissions: ['reminders.delete'],
    },
    handler: controller.deleteReminder,
  })
  return api.router
}
