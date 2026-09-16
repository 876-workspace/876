import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './activity.controller.js'

export function createActivityRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get(
    '/:projectId/activity',
    requireInternalKey,
    controller.listProjectActivity
  )

  return router
}
