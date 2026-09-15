import type { Request, Response } from 'express'

import { sendProjectsList, sendProjectsResult } from '../../http/result.js'
import * as service from './task-lists.service.js'
import {
  archiveTaskListBodySchema,
  createTaskListBodySchema,
  listTaskListsQuerySchema,
  moveIssuesBodySchema,
  reorderTaskListsBodySchema,
  taskListParamsSchema,
  taskListProjectParamsSchema,
  updateTaskListBodySchema,
} from './task-lists.schemas.js'

export async function listTaskLists(req: Request, res: Response) {
  const { organizationId, projectId } = taskListProjectParamsSchema.parse(
    req.params
  )
  const query = listTaskListsQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listTaskLists(
      organizationId,
      projectId,
      query.includeArchived === 'true'
    ),
    `/v1/organizations/${organizationId}/projects/${projectId}/task-lists`
  )
}

export async function createTaskList(req: Request, res: Response) {
  const { organizationId, projectId } = taskListProjectParamsSchema.parse(
    req.params
  )
  return sendProjectsResult(
    res,
    await service.createTaskList(
      organizationId,
      projectId,
      createTaskListBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveTaskList(req: Request, res: Response) {
  const { organizationId, id } = taskListParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveTaskList(organizationId, id)
  )
}

export async function updateTaskList(req: Request, res: Response) {
  const { organizationId, id } = taskListParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateTaskList(
      organizationId,
      id,
      updateTaskListBodySchema.parse(req.body)
    )
  )
}

export async function removeTaskList(req: Request, res: Response) {
  const { organizationId, id } = taskListParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeTaskList(organizationId, id)
  )
}

export async function archiveTaskList(req: Request, res: Response) {
  const { organizationId, id } = taskListParamsSchema.parse(req.params)
  archiveTaskListBodySchema.parse(req.body ?? {})
  return sendProjectsResult(
    res,
    await service.archiveTaskList(organizationId, id)
  )
}

export async function restoreTaskList(req: Request, res: Response) {
  const { organizationId, id } = taskListParamsSchema.parse(req.params)
  archiveTaskListBodySchema.parse(req.body ?? {})
  return sendProjectsResult(
    res,
    await service.restoreTaskList(organizationId, id)
  )
}

export async function reorderTaskLists(req: Request, res: Response) {
  const { organizationId, projectId } = taskListProjectParamsSchema.parse(
    req.params
  )
  return sendProjectsList(
    res,
    await service.reorderTaskLists(
      organizationId,
      projectId,
      reorderTaskListsBodySchema.parse(req.body)
    ),
    `/v1/organizations/${organizationId}/projects/${projectId}/task-lists`
  )
}

export async function moveIssues(req: Request, res: Response) {
  const { organizationId, id } = taskListParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.moveIssuesToTaskList(
      organizationId,
      id,
      moveIssuesBodySchema.parse(req.body)
    )
  )
}

export async function workBreakdown(req: Request, res: Response) {
  const { organizationId, projectId } = taskListProjectParamsSchema.parse(
    req.params
  )
  return sendProjectsResult(
    res,
    await service.workBreakdown(organizationId, projectId)
  )
}
