import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './comments.controller.js'

export function createCommentsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.list)
  router.post('/', requireInternalKey, controller.create)
  router.patch('/:commentId', requireInternalKey, controller.update)
  router.delete('/:commentId', requireInternalKey, controller.remove)

  return router
}
