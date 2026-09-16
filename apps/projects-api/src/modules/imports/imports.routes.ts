import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './imports.controller.js'

export function createImportsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.post('/', requireInternalKey, controller.createJob)
  router.get('/', requireInternalKey, controller.listJobs)
  router.get('/:id', requireInternalKey, controller.retrieveJob)
  router.get('/:id/rows', requireInternalKey, controller.listJobRows)
  router.post('/:id/commit', requireInternalKey, controller.commitJob)

  return router
}
