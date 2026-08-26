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

  return router
}
