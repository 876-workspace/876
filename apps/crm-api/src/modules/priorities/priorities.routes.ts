import { Router } from 'express'

import { requireInternalOrServiceApp } from '../../http/service-auth.js'
import * as controller from './priorities.controller.js'

export function createPrioritiesRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalOrServiceApp, controller.listPriorities)
  router.post('/', requireInternalOrServiceApp, controller.createPriority)
  router.get('/:priorityId', requireInternalOrServiceApp, controller.retrievePriority)
  router.patch('/:priorityId', requireInternalOrServiceApp, controller.updatePriority)
  router.delete('/:priorityId', requireInternalOrServiceApp, controller.deletePriority)

  return router
}
