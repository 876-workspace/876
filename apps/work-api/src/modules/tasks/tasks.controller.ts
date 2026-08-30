import type { Request, Response } from 'express'

import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as service from './tasks.service.js'
import {
  createTaskBodySchema,
  deleteTaskBodySchema,
  listTasksQuerySchema,
  organizationParamsSchema,
  taskParamsSchema,
  updateTaskBodySchema,
} from './tasks.schemas.js'

export async function listTasks(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listTasksQuerySchema.parse(req.query)
  const context = query.context_service
    ? {
        service: query.context_service,
        resource: query.context_resource!,
        id: query.context_id!,
      }
    : undefined
  const result = await service.list(organizationId, {
    ...(context ? { context } : {}),
    ...(query.priority_id ? { priorityId: query.priority_id } : {}),
  })
  return sendWorkList(
    res,
    result,
    `/v1/organizations/${organizationId}/tasks`
  )
}

export async function createTask(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createTaskBodySchema.parse(req.body)
  return sendWorkResult(res, await service.create(organizationId, input), 201)
}

export async function updateTask(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const input = updateTaskBodySchema.parse(req.body)
  const result = await service.update(organizationId, taskId, input)
  if (!result) return sendWorkError(res, 'work/task-not-found')
  return sendWorkResult(res, result)
}

export async function deleteTask(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const { deletedBy } = deleteTaskBodySchema.parse(req.body)
  const result = await service.remove(organizationId, taskId, deletedBy)
  if (!result) return sendWorkError(res, 'work/task-not-found')
  return sendWorkResult(res, result)
}
