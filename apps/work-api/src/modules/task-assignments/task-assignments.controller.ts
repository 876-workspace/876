import type { Request, Response } from 'express'

import { sendWorkError, sendWorkList, sendWorkResult } from '../../http/result.js'
import * as service from './task-assignments.service.js'
import {
  assignmentParamsSchema,
  createAssignmentBodySchema,
  taskParamsSchema,
  updateAssignmentBodySchema,
} from './task-assignments.schemas.js'

export async function listAssignments(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const result = await service.list(organizationId, taskId)
  if (!result) return sendWorkError(res, 'work/task-not-found')
  return sendWorkList(res, result, `/v1/organizations/${organizationId}/tasks/${taskId}/assignments`)
}
export async function createAssignment(req: Request, res: Response) {
  const { organizationId, taskId } = taskParamsSchema.parse(req.params)
  const result = await service.create(
    organizationId,
    taskId,
    createAssignmentBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/assignment-not-found')
  return sendWorkResult(res, result, 201)
}
export async function updateAssignment(req: Request, res: Response) {
  const { organizationId, taskId, assignmentId } = assignmentParamsSchema.parse(req.params)
  const result = await service.update(
    organizationId,
    taskId,
    assignmentId,
    updateAssignmentBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/assignment-not-found')
  return sendWorkResult(res, result)
}
export async function deleteAssignment(req: Request, res: Response) {
  const { organizationId, taskId, assignmentId } = assignmentParamsSchema.parse(req.params)
  const result = await service.remove(organizationId, taskId, assignmentId)
  if (!result) return sendWorkError(res, 'work/assignment-not-found')
  return sendWorkResult(res, result)
}
