import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './layouts.controller.js'

export function createLayoutsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/layouts/resolve', requireInternalKey, controller.resolve)
  router.get('/layouts', requireInternalKey, controller.list)
  router.post('/layouts', requireInternalKey, controller.create)
  router.get('/layouts/:id', requireInternalKey, controller.retrieve)
  router.patch('/layouts/:id', requireInternalKey, controller.update)
  router.delete('/layouts/:id', requireInternalKey, controller.remove)
  router.post(
    '/layouts/:id/make-default',
    requireInternalKey,
    controller.makeDefault
  )

  return router
}
