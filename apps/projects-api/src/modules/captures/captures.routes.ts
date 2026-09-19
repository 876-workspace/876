import { Router } from 'express'
import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './captures.controller.js'
export function createCapturesRouter(): Router {
  const router = Router({ mergeParams: true })
  router.get('/', requireInternalKey, controller.list)
  router.post('/', requireInternalKey, controller.create)
  router.patch('/:captureId', requireInternalKey, controller.update)
  router.post('/:captureId/promote', requireInternalKey, controller.promote)
  router.post('/:captureId/discard', requireInternalKey, controller.discard)
  router.delete('/:captureId', requireInternalKey, controller.remove)
  return router
}
