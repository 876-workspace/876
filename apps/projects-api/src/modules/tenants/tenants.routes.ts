import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './tenants.controller.js'

export function createTenantsRouter(): Router {
  const router = Router()
  router.post('/ensure', requireInternalKey, controller.ensureTenant)
  router.get('/:organizationId', requireInternalKey, controller.retrieveTenant)

  return router
}
