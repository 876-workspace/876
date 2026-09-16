import { Router } from 'express'

import { requireInternalKey } from '../../http/internal-auth.js'
import * as controller from './finance.controller.js'

export function createFinanceRouter(): Router {
  const router = Router({ mergeParams: true })

  router.get(
    '/projects/:projectId/billing',
    requireInternalKey,
    controller.getBilling
  )
  router.put(
    '/projects/:projectId/billing',
    requireInternalKey,
    controller.putBilling
  )
  router.get(
    '/projects/:projectId/budgets',
    requireInternalKey,
    controller.listBudgets
  )
  router.post(
    '/projects/:projectId/budgets',
    requireInternalKey,
    controller.createBudget
  )
  router.get(
    '/projects/:projectId/budgets/:budgetId',
    requireInternalKey,
    controller.retrieveBudget
  )
  router.patch(
    '/projects/:projectId/budgets/:budgetId',
    requireInternalKey,
    controller.updateBudget
  )
  router.delete(
    '/projects/:projectId/budgets/:budgetId',
    requireInternalKey,
    controller.removeBudget
  )
  router.get(
    '/projects/:projectId/rates',
    requireInternalKey,
    controller.listRates
  )
  router.post(
    '/projects/:projectId/rates',
    requireInternalKey,
    controller.createRate
  )
  router.get(
    '/projects/:projectId/rates/:rateId',
    requireInternalKey,
    controller.retrieveRate
  )
  router.patch(
    '/projects/:projectId/rates/:rateId',
    requireInternalKey,
    controller.updateRate
  )
  router.delete(
    '/projects/:projectId/rates/:rateId',
    requireInternalKey,
    controller.removeRate
  )
  router.get(
    '/projects/:projectId/financial-summary',
    requireInternalKey,
    controller.getFinancialSummary
  )
  router.post(
    '/projects/:projectId/invoice-drafts',
    requireInternalKey,
    controller.createInvoiceDraft
  )

  return router
}
