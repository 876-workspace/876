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
    ...(query.list_id ? { listId: query.list_id } : {}),
    ...(query.parent_task_id !== undefined
      ? { parentTaskId: query.parent_task_id || null }
      : {}),
    ...(query.priority_id ? { priorityId: query.priority_id } : {}),
    ...(query.assignee_id ? { assigneeId: query.assignee_id } : {}),
    ...(query.status ? { status: query.status } : {}),
    limit: query.limit,
    ...(query.starting_after ? { startingAfter: query.starting_after } : {}),
    ...(query.ending_before ? { endingBefore: query.ending_before } : {}),
  })
  return sendWorkList(res, result, `/v1/organizations/${organizationId}/tasks`)
}

export async function retrieveTask(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, taskId)
  if (!result) return sendWorkError(res, 'work/task-not-found')
  return sendWorkResult(res, result)
}
export async function createTask(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkResult(
    res,
    await service.create(organizationId, createTaskBodySchema.parse(req.body)),
    201
  )
}
export async function updateTask(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const result = await service.update(
    organizationId,
    taskId,
    updateTaskBodySchema.parse(req.body)
  )
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
