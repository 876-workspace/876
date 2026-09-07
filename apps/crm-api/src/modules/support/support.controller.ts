import type { Request, Response } from 'express'

import { sendCrmList, sendCrmResult } from '../../http/result.js'
import {
  createSupportRequestBodySchema,
  listSupportRequestsQuerySchema,
} from './support.schemas.js'
import * as service from './support.service.js'

export async function listSupportCategories(_req: Request, res: Response) {
  const result = await service.listCategories()
  return sendCrmList(res, result, '/v1/service/support/categories')
}

export async function listSupportRequests(req: Request, res: Response) {
  const { sourceOrganizationId } = listSupportRequestsQuerySchema.parse(req.query)
  const result = await service.listRequests(sourceOrganizationId)
  return sendCrmList(res, result, '/v1/service/support/requests')
}

export async function createSupportRequest(req: Request, res: Response) {
  const input = createSupportRequestBodySchema.parse(req.body)
  const result = await service.createRequest(input)
  return sendCrmResult(res, result, 201)
}
