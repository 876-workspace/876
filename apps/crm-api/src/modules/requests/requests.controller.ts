import type { Request, Response } from 'express'

import { sendCrmError, sendCrmList, sendCrmResult } from '../../http/result.js'
import * as service from './requests.service.js'
import {
  createRequestBodySchema,
  deleteRequestBodySchema,
  listRequestsQuerySchema,
  organizationParamsSchema,
  requestParamsSchema,
  updateRequestBodySchema,
} from './requests.schemas.js'

export async function listRequests(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const filters = listRequestsQuerySchema.parse(req.query)
  const result = await service.list(organizationId, filters)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/requests`
  )
}

export async function retrieveRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, id)
  if (!result) return sendCrmError(res, 'crm/request-not-found')
  return sendCrmResult(res, result)
}

export async function createRequest(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createRequestBodySchema.parse(req.body)
  const result = await service.create(organizationId, input)
  return sendCrmResult(res, result, 201)
}

export async function updateRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const input = updateRequestBodySchema.parse(req.body)
  const result = await service.update(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/request-not-found')
  return sendCrmResult(res, result)
}

export async function deleteRequest(req: Request, res: Response) {
  const { organizationId, id } = requestParamsSchema.parse(req.params)
  const input = deleteRequestBodySchema.parse(req.body)
  const result = await service.remove(organizationId, id, input)
  if (!result) return sendCrmError(res, 'crm/request-not-found')
  return sendCrmResult(res, result)
}
