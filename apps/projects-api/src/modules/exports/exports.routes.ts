import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './exports.controller.js'

export function createExportsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/work-items.csv', requireInternalKey, controller.exportWorkItems)
  router.get(
    '/time-entries.csv',
    requireInternalKey,
    controller.exportTimeEntries
  )

  return router
}
