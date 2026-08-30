import type { Request, Response } from 'express'

import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as service from './task-lists.service.js'
import {
  createTaskListBodySchema,
  deleteTaskListBodySchema,
  listTaskListsQuerySchema,
  organizationParamsSchema,
  taskListParamsSchema,
  updateTaskListBodySchema,
} from './task-lists.schemas.js'

export async function listTaskLists(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listTaskListsQuerySchema.parse(req.query)
  const result = await service.list(organizationId, {
    ...(query.owner_user_id ? { ownerUserId: query.owner_user_id } : {}),
    limit: query.limit,
    ...(query.starting_after ? { startingAfter: query.starting_after } : {}),
    ...(query.ending_before ? { endingBefore: query.ending_before } : {}),
  })
  return sendWorkList(
    res,
    result,
    `/v1/organizations/${organizationId}/task-lists`
  )
}

export async function retrieveTaskList(req: Request, res: Response) {
  const { organizationId, listId } = taskListParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, listId)
  if (!result) return sendWorkError(res, 'work/task-list-not-found')
  return sendWorkResult(res, result)
}

export async function createTaskList(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createTaskListBodySchema.parse(req.body)
  return sendWorkResult(res, await service.create(organizationId, input), 201)
}

export async function updateTaskList(req: Request, res: Response) {
  const { organizationId, listId } = taskListParamsSchema.parse(req.params)
  const input = updateTaskListBodySchema.parse(req.body)
  const result = await service.update(organizationId, listId, input)
  if (!result) return sendWorkError(res, 'work/task-list-not-found')
  return sendWorkResult(res, result)
}

export async function deleteTaskList(req: Request, res: Response) {
  const { organizationId, listId } = taskListParamsSchema.parse(req.params)
  const { deletedBy } = deleteTaskListBodySchema.parse(req.body)
  const result = await service.remove(organizationId, listId, deletedBy)
  if (!result) return sendWorkError(res, 'work/task-list-not-found')
  return sendWorkResult(res, result)
}
