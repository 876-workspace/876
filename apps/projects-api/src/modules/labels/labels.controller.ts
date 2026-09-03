import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import {
  createLabelBodySchema,
  labelParamsSchema,
  organizationParamsSchema,
  updateLabelBodySchema,
} from './labels.schemas.js'
import * as service from './labels.service.js'

export async function list(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const result = await service.list(params.organizationId)
  return sendProjectsList(
    res,
    result,
    `/v1/organizations/${params.organizationId}/labels`
  )
}

export async function create(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const body = createLabelBodySchema.parse(req.body)
  const result = await service.create(params.organizationId, body)
  return sendProjectsResult(res, result, 201)
}

export async function retrieve(req: Request, res: Response) {
  const params = labelParamsSchema.parse(req.params)
  const result = await service.retrieve(params.organizationId, params.labelId)
  return sendProjectsResult(res, result)
}

export async function update(req: Request, res: Response) {
  const params = labelParamsSchema.parse(req.params)
  const body = updateLabelBodySchema.parse(req.body)
  const result = await service.update(
    params.organizationId,
    params.labelId,
    body
  )
  return sendProjectsResult(res, result)
}

export async function remove(req: Request, res: Response) {
  const params = labelParamsSchema.parse(req.params)
  const result = await service.remove(params.organizationId, params.labelId)
  return sendProjectsResult(res, result)
}
