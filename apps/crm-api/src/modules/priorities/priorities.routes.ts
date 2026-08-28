import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './priorities.controller.js'

export function createPrioritiesRouter() {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternal, controller.listPriorities)
  router.post('/', requireInternal, controller.createPriority)
  router.get('/:priorityId', requireInternal, controller.retrievePriority)
  router.patch('/:priorityId', requireInternal, controller.updatePriority)
  router.delete('/:priorityId', requireInternal, controller.deletePriority)

  return router
}
