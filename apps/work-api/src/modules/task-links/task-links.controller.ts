import type { Request, Response } from 'express'

import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as service from './task-links.service.js'
import {
  createTaskLinkBodySchema,
  taskLinkParamsSchema,
  taskParamsSchema,
} from './task-links.schemas.js'

export async function listTaskLinks(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const result = await service.list(organizationId, taskId)
  if (!result) return sendWorkError(res, 'work/task-not-found')
  return sendWorkList(
    res,
    result,
    `/v1/organizations/${organizationId}/tasks/${taskId}/links`
  )
}

export async function createTaskLink(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const input = createTaskLinkBodySchema.parse(req.body)
  const result = await service.create(organizationId, taskId, input)
  if (!result) return sendWorkError(res, 'work/task-not-found')
  return sendWorkResult(res, result, 201)
}

export async function deleteTaskLink(req: Request, res: Response) {
  const { organizationId, taskId, linkId } = taskLinkParamsSchema.parse(
    req.params
  )
  const result = await service.remove(organizationId, taskId, linkId)
  if (!result) return sendWorkError(res, 'work/task-link-not-found')
  return sendWorkResult(res, result)
}
