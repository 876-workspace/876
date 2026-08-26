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
  router.delete('/:id/notes/:noteId', requireInternal, controller.deleteRequestNote)
  router.patch('/:id/notes/:noteId', requireInternal, controller.updateRequestNote)

  return router
}
