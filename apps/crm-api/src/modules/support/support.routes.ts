import { Router } from 'express'

import { requireSupportService } from '../../http/support-service-auth.js'
import * as controller from './support.controller.js'

export function createSupportRouter() {
  const router = Router()

  router.get('/categories', requireSupportService, controller.listSupportCategories)
  router.get('/requests', requireSupportService, controller.listSupportRequests)
  router.post('/requests', requireSupportService, controller.createSupportRequest)

  return router
}
