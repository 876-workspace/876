import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import * as service from './baselines.service.js'
import {
  baselineComparisonParamsSchema,
  baselineParamsSchema,
  baselineProjectParamsSchema,
  createBaselineBodySchema,
} from './baselines.schemas.js'

export async function listBaselines(req: Request, res: Response) {
  const params = baselineProjectParamsSchema.parse(req.params)
  return sendProjectsList(
    res,
    await service.listBaselines(params.organizationId, params.projectId),
    `/v1/organizations/${params.organizationId}/projects/${params.projectId}/baselines`
  )
}

export async function createBaseline(req: Request, res: Response) {
  const params = baselineProjectParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createBaseline(
      params.organizationId,
      params.projectId,
      createBaselineBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveBaseline(req: Request, res: Response) {
  const params = baselineParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveBaseline(params.organizationId, params.baselineId)
  )
}

export async function removeBaseline(req: Request, res: Response) {
  const params = baselineParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeBaseline(params.organizationId, params.baselineId)
  )
}

export async function compareBaseline(req: Request, res: Response) {
  const params = baselineComparisonParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.compareBaseline(
      params.organizationId,
      params.projectId,
      params.baselineId
    )
  )
}
