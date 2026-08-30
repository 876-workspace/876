import { createApiRouter, type GuardResolver } from '../../http/api-router.js'
import * as controller from './calendars.controller.js'

export function createCalendarsRouter(resolveGuards: GuardResolver) {
  const api = createApiRouter(resolveGuards)

  api.get({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.calendars.read',
      sessionPermissions: ['calendars.view'],
    },
    handler: controller.listCalendars,
  })
  api.post({
    path: '/',
    security: {
      kind: 'integration',
      scope: 'work.calendars.write',
      sessionPermissions: ['calendars.create'],
    },
    handler: controller.createCalendar,
  })
  api.post({
    path: '/primary',
    security: {
      kind: 'integration',
      scope: 'work.calendars.write',
      sessionPermissions: ['calendars.create'],
    },
    handler: controller.ensurePrimaryCalendar,
  })
  api.get({
    path: '/:calendarId',
    security: {
      kind: 'integration',
      scope: 'work.calendars.read',
      sessionPermissions: ['calendars.view'],
    },
    handler: controller.retrieveCalendar,
  })
  api.patch({
    path: '/:calendarId',
    security: {
      kind: 'integration',
      scope: 'work.calendars.write',
      sessionPermissions: ['calendars.edit'],
    },
    handler: controller.updateCalendar,
  })
  api.delete({
    path: '/:calendarId',
    security: {
      kind: 'integration',
      scope: 'work.calendars.write',
      sessionPermissions: ['calendars.delete'],
    },
    handler: controller.deleteCalendar,
  })

  return api.router
}
