import type { Request, Response } from 'express'

import { sendCrmError, sendCrmResult } from '../../http/result.js'
import * as service from './tasks.service.js'
import {
  createTaskBodySchema,
  deleteTaskBodySchema,
  requestParamsSchema,
  taskParamsSchema,
  updateTaskBodySchema,
} from './tasks.schemas.js'

export async function listTasks(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const data = await service.list(organizationId, requestId)

  return res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/requests/${requestId}/tasks`,
    },
    error: null,
  })
}

export async function createTask(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const input = createTaskBodySchema.parse(req.body)
  const result = await service.create(organizationId, requestId, input)

  return sendCrmResult(res, result, 201)
}

export async function updateTask(req: Request, res: Response) {
  const { organizationId, id: requestId, taskId } = taskParamsSchema.parse(req.params)
  const input = updateTaskBodySchema.parse(req.body)
  const result = await service.update(organizationId, requestId, taskId, input)
  if (!result) return sendCrmError(res, 'crm/task-not-found')

  return sendCrmResult(res, result)
}

export async function deleteTask(req: Request, res: Response) {
  const { organizationId, id: requestId, taskId } = taskParamsSchema.parse(req.params)
  const { deletedBy } = deleteTaskBodySchema.parse(req.body)
  const result = await service.remove(organizationId, requestId, taskId, deletedBy)
  if (!result) return sendCrmError(res, 'crm/task-not-found')

  return sendCrmResult(res, result)
}
