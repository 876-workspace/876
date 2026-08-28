import type { Request, Response } from 'express'

import * as service from './tasks.service.js'
import {
  createTaskBodySchema,
  deleteTaskBodySchema,
  requestParamsSchema,
  taskParamsSchema,
  updateTaskBodySchema,
} from './tasks.schemas.js'

function notFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: { code: 'crm/task-not-found', message: 'Request task not found.' },
  })
}

export async function listTasks(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const data = await service.list(organizationId, requestId)

  res.json({
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

  res.status(201).json({
    data: await service.create(organizationId, requestId, input),
    error: null,
  })
}

export async function updateTask(req: Request, res: Response) {
  const { organizationId, id: requestId, taskId } = taskParamsSchema.parse(req.params)
  const input = updateTaskBodySchema.parse(req.body)
  const data = await service.update(organizationId, requestId, taskId, input)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function deleteTask(req: Request, res: Response) {
  const { organizationId, id: requestId, taskId } = taskParamsSchema.parse(req.params)
  const { deletedBy } = deleteTaskBodySchema.parse(req.body)
  const data = await service.remove(organizationId, requestId, taskId, deletedBy)
  if (!data) return notFound(res)

  res.json({ data, error: null })
}
