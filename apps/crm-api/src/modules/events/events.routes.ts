import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './events.controller.js'

export function createEventsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listEvents)
  router.post('/', requireInternal, controller.createEvent)
  router.get('/:eventId', requireInternal, controller.retrieveEvent)
  router.patch('/:eventId', requireInternal, controller.updateEvent)
  router.delete('/:eventId', requireInternal, controller.deleteEvent)
  router.get(
    '/:eventId/participants',
    requireInternal,
    controller.listParticipants
  )
  router.post(
    '/:eventId/participants',
    requireInternal,
    controller.createParticipant
  )
  router.patch(
    '/:eventId/participants/:participantId',
    requireInternal,
    controller.updateParticipant
  )
  router.delete(
    '/:eventId/participants/:participantId',
    requireInternal,
    controller.deleteParticipant
  )

  return router
}
