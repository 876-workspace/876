import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './reports.controller.js'

export function createReportsRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get('/reports/work', requireInternalKey, controller.getWorkReport)
  router.get('/reports/health', requireInternalKey, controller.getHealthReport)
  router.get('/reports/time', requireInternalKey, controller.getTimeReport)
  router.get(
    '/reports/budget-variance',
    requireInternalKey,
    controller.getBudgetVarianceReport
  )
  router.get(
    '/reports/workload',
    requireInternalKey,
    controller.getWorkloadReport
  )
  router.get('/capacity', requireInternalKey, controller.listCapacities)
  router.post('/capacity', requireInternalKey, controller.createCapacity)
  router.patch(
    '/capacity/:capacityId',
    requireInternalKey,
    controller.updateCapacity
  )
  router.delete(
    '/capacity/:capacityId',
    requireInternalKey,
    controller.removeCapacity
  )

  return router
}
