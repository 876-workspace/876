import { Router } from 'express'

import * as controller from './tenants.controller.js'

export function createTenantsRouter() {
  const router = Router()
  router.get('/', controller.retrieveTenant)
  router.post('/', controller.ensureTenant)
  return router
}
