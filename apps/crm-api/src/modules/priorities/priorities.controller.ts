import type { Request, Response } from 'express'

import { sendCrmError, sendCrmList, sendCrmResult } from '../../http/result.js'
import * as service from './priorities.service.js'
import {
  createPriorityBodySchema,
  deletePriorityBodySchema,
  listPrioritiesQuerySchema,
  organizationParamsSchema,
  priorityParamsSchema,
  updatePriorityBodySchema,
} from './priorities.schemas.js'

export async function listPriorities(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listPrioritiesQuerySchema.parse(req.query)
  const result = await service.list(organizationId, query.active)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/request-priorities`
  )
}

export async function retrievePriority(req: Request, res: Response) {
  const { organizationId, priorityId } = priorityParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, priorityId)
  if (!result) return sendCrmError(res, 'crm/priority-not-found')
  return sendCrmResult(res, result)
}

export async function createPriority(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createPriorityBodySchema.parse(req.body)
  const result = await service.create(organizationId, input)
  return sendCrmResult(res, result, 201)
}

export async function updatePriority(req: Request, res: Response) {
  const { organizationId, priorityId } = priorityParamsSchema.parse(req.params)
  const input = updatePriorityBodySchema.parse(req.body)
  const result = await service.update(organizationId, priorityId, input)
  if (!result) return sendCrmError(res, 'crm/priority-not-found')
  return sendCrmResult(res, result)
}

export async function deletePriority(req: Request, res: Response) {
  const { organizationId, priorityId } = priorityParamsSchema.parse(req.params)
  const input = deletePriorityBodySchema.parse(req.body)
  const result = await service.remove(organizationId, priorityId, input)
  if (!result) return sendCrmError(res, 'crm/priority-not-found')
  return sendCrmResult(res, result)
}
