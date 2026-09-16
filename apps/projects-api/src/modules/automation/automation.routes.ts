import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './automation.controller.js'

export function createAutomationRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/automation-rules', requireInternalKey, controller.listRules)
  router.post('/automation-rules', requireInternalKey, controller.createRule)
  router.get(
    '/automation-rules/:id',
    requireInternalKey,
    controller.retrieveRule
  )
  router.patch(
    '/automation-rules/:id',
    requireInternalKey,
    controller.updateRule
  )
  router.delete(
    '/automation-rules/:id',
    requireInternalKey,
    controller.removeRule
  )
  router.get(
    '/automation-rules/:id/runs',
    requireInternalKey,
    controller.listRuns
  )
  router.post(
    '/automation-rules/:id/test',
    requireInternalKey,
    controller.testRule
  )
  router.get('/notifications', requireInternalKey, controller.listNotifications)
  router.post(
    '/notifications/:id/read',
    requireInternalKey,
    controller.readNotification
  )

  return router
}
