import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './webhooks.controller.js'

export function createWebhooksInternalRouter(): Router {
  const router = Router()
  router.post(
    '/webhook-deliveries/:deliveryId/replay',
    requireInternalKey,
    controller.replayDelivery
  )
  return router
}
