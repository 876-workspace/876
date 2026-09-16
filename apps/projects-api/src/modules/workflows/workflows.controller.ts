import { sendProjectsResult } from '../../http/result.js'
import type { Request, Response } from 'express'
import {
  blueprintBodySchema,
  blueprintParamsSchema,
} from './workflows.schemas.js'
import * as service from './workflows.service.js'

export async function getBlueprint(req: Request, res: Response) {
  const params = blueprintParamsSchema.parse(req.params)
  const result = await service.getBlueprint(
    params.organizationId,
    params.workItemTypeId
  )
  return sendProjectsResult(res, result)
}

export async function putBlueprint(req: Request, res: Response) {
  const params = blueprintParamsSchema.parse(req.params)
  const body = blueprintBodySchema.parse(req.body)
  const result = await service.putBlueprint(
    params.organizationId,
    params.workItemTypeId,
    body
  )
  return sendProjectsResult(res, result)
}
