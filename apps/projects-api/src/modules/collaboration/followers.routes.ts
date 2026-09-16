import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './followers.controller.js'

export function createFollowersRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/', requireInternalKey, controller.list)
  router.post('/', requireInternalKey, controller.follow)
  router.delete('/', requireInternalKey, controller.unfollow)

  return router
}
