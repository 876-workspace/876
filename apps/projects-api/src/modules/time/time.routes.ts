import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './time.controller.js'

export function createTimeRouter(): Router {
  const router = Router({ mergeParams: true })

  router.post(
    '/time-entries/timer/start',
    requireInternalKey,
    controller.startTimer
  )
  router.post(
    '/time-entries/timer/stop',
    requireInternalKey,
    controller.stopTimer
  )
  router.get(
    '/time-entries/timer/current',
    requireInternalKey,
    controller.currentTimer
  )
  router.get('/time-entries', requireInternalKey, controller.listTimeEntries)
  router.post('/time-entries', requireInternalKey, controller.createTimeEntry)
  router.get(
    '/time-entries/:timeEntryId',
    requireInternalKey,
    controller.retrieveTimeEntry
  )
  router.patch(
    '/time-entries/:timeEntryId',
    requireInternalKey,
    controller.updateTimeEntry
  )
  router.delete(
    '/time-entries/:timeEntryId',
    requireInternalKey,
    controller.removeTimeEntry
  )
  router.get('/timesheets', requireInternalKey, controller.listTimesheets)
  router.post('/timesheets', requireInternalKey, controller.createTimesheet)
  router.get(
    '/timesheets/:timesheetId',
    requireInternalKey,
    controller.retrieveTimesheet
  )
  router.post(
    '/timesheets/:timesheetId/submit',
    requireInternalKey,
    controller.submitTimesheet
  )
  router.post(
    '/timesheets/:timesheetId/approve',
    requireInternalKey,
    controller.approveTimesheet
  )
  router.post(
    '/timesheets/:timesheetId/reject',
    requireInternalKey,
    controller.rejectTimesheet
  )
  router.post(
    '/timesheets/:timesheetId/recall',
    requireInternalKey,
    controller.recallTimesheet
  )
  router.get(
    '/timesheets/:timesheetId/events',
    requireInternalKey,
    controller.listTimesheetEvents
  )
  router.get('/time-summary', requireInternalKey, controller.getTimeSummary)

  return router
}
