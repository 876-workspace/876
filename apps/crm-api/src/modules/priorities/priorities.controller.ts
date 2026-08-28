import type { Request, Response } from 'express'

import * as service from './priorities.service.js'
import {
  createPriorityBodySchema,
  deletePriorityBodySchema,
  listPrioritiesQuerySchema,
  organizationParamsSchema,
  priorityParamsSchema,
  updatePriorityBodySchema,
} from './priorities.schemas.js'

function priorityNotFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: {
      code: 'crm/priority-not-found',
      message: 'Request priority not found.',
    },
  })
}

export async function listPriorities(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listPrioritiesQuerySchema.parse(req.query)
  const data = await service.list(organizationId, query.active)

  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/request-priorities`,
    },
    error: null,
  })
}

export async function retrievePriority(req: Request, res: Response) {
  const { organizationId, priorityId } = priorityParamsSchema.parse(req.params)
  const data = await service.retrieve(organizationId, priorityId)
  if (!data) return priorityNotFound(res)

  res.json({ data, error: null })
}

export async function createPriority(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createPriorityBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.create(organizationId, input),
    error: null,
  })
}

export async function updatePriority(req: Request, res: Response) {
  const { organizationId, priorityId } = priorityParamsSchema.parse(req.params)
  const input = updatePriorityBodySchema.parse(req.body)
  const data = await service.update(organizationId, priorityId, input)
  if (!data) return priorityNotFound(res)

  res.json({ data, error: null })
}

export async function deletePriority(req: Request, res: Response) {
  const { organizationId, priorityId } = priorityParamsSchema.parse(req.params)
  const input = deletePriorityBodySchema.parse(req.body)
  const data = await service.remove(organizationId, priorityId, input)
  if (!data) return priorityNotFound(res)

  res.json({ data, error: null })
}
