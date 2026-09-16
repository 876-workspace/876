import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './calendar.controller.js'

export function createCalendarRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/events', requireInternalKey, controller.listEvents)
  router.post('/events', requireInternalKey, controller.createEvent)
  router.get('/events/:eventId', requireInternalKey, controller.retrieveEvent)
  router.patch('/events/:eventId', requireInternalKey, controller.updateEvent)
  router.delete('/events/:eventId', requireInternalKey, controller.removeEvent)
  router.post(
    '/events/:eventId/attendees',
    requireInternalKey,
    controller.addAttendee
  )
  router.patch(
    '/events/:eventId/attendees/:userId',
    requireInternalKey,
    controller.respondAttendee
  )
  router.delete(
    '/events/:eventId/attendees/:userId',
    requireInternalKey,
    controller.removeAttendee
  )
  router.get('/reminders/due', requireInternalKey, controller.listDueReminders)
  router.get('/reminders', requireInternalKey, controller.listReminders)
  router.post('/reminders', requireInternalKey, controller.createReminder)
  router.patch(
    '/reminders/:reminderId',
    requireInternalKey,
    controller.updateReminder
  )
  router.delete(
    '/reminders/:reminderId',
    requireInternalKey,
    controller.removeReminder
  )
  router.get('/calendar', requireInternalKey, controller.getCalendar)
  router.get('/my-work', requireInternalKey, controller.getMyWork)

  return router
}
