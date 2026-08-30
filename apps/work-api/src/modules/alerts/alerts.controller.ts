import type { Request, Response } from 'express'
import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as service from './alerts.service.js'
import {
  alertParamsSchema,
  createAlertBodySchema,
  listAlertsQuerySchema,
  organizationParamsSchema,
  updateAlertBodySchema,
} from './alerts.schemas.js'
export async function listAlerts(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const q = listAlertsQuerySchema.parse(req.query)
  return sendWorkList(
    res,
    await service.list(organizationId, {
      ...(q.task_id ? { taskId: q.task_id } : {}),
      ...(q.event_id ? { eventId: q.event_id } : {}),
      ...(q.user_id ? { userId: q.user_id } : {}),
      ...(q.status ? { status: q.status } : {}),
      limit: q.limit,
      ...(q.starting_after ? { startingAfter: q.starting_after } : {}),
      ...(q.ending_before ? { endingBefore: q.ending_before } : {}),
    }),
    `/v1/organizations/${organizationId}/alerts`
  )
}
export async function retrieveAlert(req: Request, res: Response) {
  const { organizationId, alertId } = alertParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, alertId)
  if (!result) return sendWorkError(res, 'work/alert-not-found')
  return sendWorkResult(res, result)
}
export async function createAlert(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkResult(
    res,
    await service.create(organizationId, createAlertBodySchema.parse(req.body)),
    201
  )
}
export async function updateAlert(req: Request, res: Response) {
  const { organizationId, alertId } = alertParamsSchema.parse(req.params)
  const result = await service.update(
    organizationId,
    alertId,
    updateAlertBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/alert-not-found')
  return sendWorkResult(res, result)
}
export async function deleteAlert(req: Request, res: Response) {
  const { organizationId, alertId } = alertParamsSchema.parse(req.params)
  const result = await service.remove(organizationId, alertId)
  if (!result) return sendWorkError(res, 'work/alert-not-found')
  return sendWorkResult(res, result)
}
