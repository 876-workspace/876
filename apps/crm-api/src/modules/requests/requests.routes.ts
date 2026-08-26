import { Router } from 'express'

import * as controller from './requests.controller.js'

export function createRequestsRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', controller.listRequests)
  router.post('/', controller.createRequest)
  router.get('/:id', controller.retrieveRequest)
  router.patch('/:id', controller.updateRequest)
  router.delete('/:id', controller.deleteRequest)

  return router
}
