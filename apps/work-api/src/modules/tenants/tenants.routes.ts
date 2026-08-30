import { Router } from 'express'

import { requireInternal } from '../../http/internal-auth.js'
import * as controller from './tenants.controller.js'

export function createTenantsRouter() {
  const router = Router()
  router.post('/', requireInternal, controller.ensureTenant)
  return router
}
