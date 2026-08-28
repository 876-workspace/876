import { isError, toAppError } from '@876/core'
import type { Request, Response } from 'express'

import { sendCrmError, sendCrmResult } from '../../http/result.js'
import * as service from './reminders.service.js'
import {
  createReminderBodySchema,
  deleteReminderBodySchema,
  reminderParamsSchema,
  requestParamsSchema,
  updateReminderBodySchema,
} from './reminders.schemas.js'

export async function listReminders(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const result = await service.list(organizationId, requestId)
  if (isError(result))
    return res
      .status(result.httpStatus)
      .json({ data: null, error: toAppError(result) })

  return res.json({
    data: {
      object: 'list',
      data: result,
      has_more: false,
      total_count: result.length,
      url: `/v1/organizations/${organizationId}/requests/${requestId}/reminders`,
    },
    error: null,
  })
}

export async function createReminder(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const input = createReminderBodySchema.parse(req.body)
  const result = await service.create(organizationId, requestId, input)
  return sendCrmResult(res, result, 201)
}

export async function updateReminder(req: Request, res: Response) {
  const { organizationId, id: requestId, reminderId } =
    reminderParamsSchema.parse(req.params)
  const input = updateReminderBodySchema.parse(req.body)
  const result = await service.update(
    organizationId,
    requestId,
    reminderId,
    input
  )
  if (!result) return sendCrmError(res, 'crm/reminder-not-found')
  return sendCrmResult(res, result)
}

export async function deleteReminder(req: Request, res: Response) {
  const { organizationId, id: requestId, reminderId } =
    reminderParamsSchema.parse(req.params)
  const { deletedBy } = deleteReminderBodySchema.parse(req.body)
  const result = await service.remove(
    organizationId,
    requestId,
    reminderId,
    deletedBy
  )
  if (!result) return sendCrmError(res, 'crm/reminder-not-found')
  return sendCrmResult(res, result)
}
