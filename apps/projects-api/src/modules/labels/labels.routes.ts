import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './labels.controller.js'

export function createLabelsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.list)
  router.post('/', requireInternalKey, controller.create)
  router.get('/:labelId', requireInternalKey, controller.retrieve)
  router.patch('/:labelId', requireInternalKey, controller.update)
  router.delete('/:labelId', requireInternalKey, controller.remove)

  return router
}
