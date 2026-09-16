import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import * as service from './reports.service.js'
import {
  budgetVarianceReportToCsv,
  healthReportToCsv,
  timeReportToCsv,
  workloadReportToCsv,
  workReportToCsv,
} from './reports.serializers.js'
import {
  budgetVarianceQuerySchema,
  capacityParamsSchema,
  createCapacityBodySchema,
  healthReportQuerySchema,
  listCapacitiesQuerySchema,
  organizationParamsSchema,
  timeReportQuerySchema,
  updateCapacityBodySchema,
  workloadQuerySchema,
  workReportQuerySchema,
} from './reports.schemas.js'

function wantsCsv(query: { format?: string }): boolean {
  return query.format === 'csv'
}

export async function getWorkReport(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = workReportQuerySchema.parse(req.query)
  const result = await service.getWorkReport(params.organizationId, query)
  if (wantsCsv(query)) {
    if (result.error !== null) return sendProjectsResult(res, result)
    return res.status(200).type('text/csv').send(workReportToCsv(result.data))
  }
  return sendProjectsResult(res, result)
}

export async function getHealthReport(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = healthReportQuerySchema.parse(req.query)
  const result = await service.getHealthReport(params.organizationId)
  if (wantsCsv(query)) {
    if (result.error !== null) return sendProjectsResult(res, result)
    return res.status(200).type('text/csv').send(healthReportToCsv(result.data))
  }
  return sendProjectsResult(res, result)
}

export async function getTimeReport(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = timeReportQuerySchema.parse(req.query)
  const result = await service.getTimeReport(params.organizationId, query)
  if (wantsCsv(query)) {
    if (result.error !== null) return sendProjectsResult(res, result)
    return res.status(200).type('text/csv').send(timeReportToCsv(result.data))
  }
  return sendProjectsResult(res, result)
}

export async function getBudgetVarianceReport(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = budgetVarianceQuerySchema.parse(req.query)
  const result = await service.getBudgetVarianceReport(
    params.organizationId,
    query
  )
  if (wantsCsv(query)) {
    if (result.error !== null) return sendProjectsResult(res, result)
    return res
      .status(200)
      .type('text/csv')
      .send(budgetVarianceReportToCsv(result.data))
  }
  return sendProjectsResult(res, result)
}

export async function getWorkloadReport(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = workloadQuerySchema.parse(req.query)
  const result = await service.getWorkloadReport(params.organizationId, query)
  if (wantsCsv(query)) {
    if (result.error !== null) return sendProjectsResult(res, result)
    return res.status(200).type('text/csv').send(workloadReportToCsv(result.data))
  }
  return sendProjectsResult(res, result)
}

export async function listCapacities(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listCapacitiesQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listCapacities(params.organizationId, query),
    `/v1/organizations/${params.organizationId}/capacity`
  )
}

export async function createCapacity(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createCapacity(
      params.organizationId,
      createCapacityBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateCapacity(req: Request, res: Response) {
  const params = capacityParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateCapacity(
      params.organizationId,
      params.capacityId,
      updateCapacityBodySchema.parse(req.body)
    )
  )
}

export async function removeCapacity(req: Request, res: Response) {
  const params = capacityParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeCapacity(params.organizationId, params.capacityId)
  )
}
