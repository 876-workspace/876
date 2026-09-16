import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import * as service from './finance.service.js'
import {
  budgetParamsSchema,
  createBudgetBodySchema,
  createInvoiceDraftBodySchema,
  createRateBodySchema,
  financialSummaryQuerySchema,
  financeProjectParamsSchema,
  putBillingBodySchema,
  rateParamsSchema,
  updateBudgetBodySchema,
  updateRateBodySchema,
} from './finance.schemas.js'

export async function getBilling(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.getBilling(params.organizationId, params.projectId)
  )
}

export async function putBilling(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.putBilling(
      params.organizationId,
      params.projectId,
      putBillingBodySchema.parse(req.body)
    )
  )
}

export async function listBudgets(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listBudgets(params.organizationId, params.projectId),
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/budgets`
  )
}

export async function createBudget(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createBudget(
      params.organizationId,
      params.projectId,
      createBudgetBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveBudget(req: Request, res: Response) {
  const params = budgetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveBudget(
      params.organizationId,
      params.projectId,
      params.budgetId
    )
  )
}

export async function updateBudget(req: Request, res: Response) {
  const params = budgetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateBudget(
      params.organizationId,
      params.projectId,
      params.budgetId,
      updateBudgetBodySchema.parse(req.body)
    )
  )
}

export async function removeBudget(req: Request, res: Response) {
  const params = budgetParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeBudget(
      params.organizationId,
      params.projectId,
      params.budgetId
    )
  )
}

export async function listRates(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listRates(params.organizationId, params.projectId),
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/rates`
  )
}

export async function createRate(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createRate(
      params.organizationId,
      params.projectId,
      createRateBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveRate(req: Request, res: Response) {
  const params = rateParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveRate(
      params.organizationId,
      params.projectId,
      params.rateId
    )
  )
}

export async function updateRate(req: Request, res: Response) {
  const params = rateParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateRate(
      params.organizationId,
      params.projectId,
      params.rateId,
      updateRateBodySchema.parse(req.body)
    )
  )
}

export async function removeRate(req: Request, res: Response) {
  const params = rateParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeRate(
      params.organizationId,
      params.projectId,
      params.rateId
    )
  )
}

export async function getFinancialSummary(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  const query = financialSummaryQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.getFinancialSummary(
      params.organizationId,
      params.projectId,
      query
    )
  )
}

export async function createInvoiceDraft(req: Request, res: Response) {
  const params = financeProjectParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createInvoiceDraft(
      params.organizationId,
      params.projectId,
      createInvoiceDraftBodySchema.parse(req.body)
    ),
    201
  )
}
