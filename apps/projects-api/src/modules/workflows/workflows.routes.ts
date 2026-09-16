import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './workflows.controller.js'

export function createWorkflowsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get(
    '/workflows/:workItemTypeId/blueprint',
    requireInternalKey,
    controller.getBlueprint
  )
  router.put(
    '/workflows/:workItemTypeId/blueprint',
    requireInternalKey,
    controller.putBlueprint
  )

  return router
}
