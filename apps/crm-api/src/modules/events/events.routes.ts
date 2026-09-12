import { Router } from 'express'

import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as controller from './events.controller.js'

export function createEventsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listEvents)
  router.post('/', requireInternalOrServiceApp, controller.createEvent)
  router.get('/:eventId', requireInternalOrServiceApp, controller.retrieveEvent)
  router.patch('/:eventId', requireInternalOrServiceApp, controller.updateEvent)
  router.delete('/:eventId', requireInternalOrServiceApp, controller.deleteEvent)
  router.get(
    '/:eventId/participants',
    requireInternalOrServiceApp,
    controller.listParticipants
  )
  router.post(
    '/:eventId/participants',
    requireInternalOrServiceApp,
    controller.createParticipant
  )
  router.patch(
    '/:eventId/participants/:participantId',
    requireInternalOrServiceApp,
    controller.updateParticipant
  )
  router.delete(
    '/:eventId/participants/:participantId',
    requireInternalOrServiceApp,
    controller.deleteParticipant
  )

  return router
}
