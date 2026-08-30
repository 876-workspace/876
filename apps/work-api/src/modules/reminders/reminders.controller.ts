import type { Request, Response } from 'express'

import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as service from './reminders.service.js'
import {
  createReminderBodySchema,
  deleteReminderBodySchema,
  listRemindersQuerySchema,
  organizationParamsSchema,
  reminderParamsSchema,
  updateReminderBodySchema,
} from './reminders.schemas.js'

export async function listReminders(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listRemindersQuerySchema.parse(req.query)
  const context = query.context_service
    ? {
        service: query.context_service,
        resource: query.context_resource!,
        id: query.context_id!,
      }
    : undefined
  const result = await service.list(organizationId, {
    ...(context ? { context } : {}),
    ...(query.user_id ? { userId: query.user_id } : {}),
  })
  return sendWorkList(
    res,
    result,
    `/v1/organizations/${organizationId}/reminders`
  )
}

export async function createReminder(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const input = createReminderBodySchema.parse(req.body)
  return sendWorkResult(res, await service.create(organizationId, input), 201)
}

export async function updateReminder(req: Request, res: Response) {
  const { organizationId, reminderId } = reminderParamsSchema.parse(req.params)
  const input = updateReminderBodySchema.parse(req.body)
  const result = await service.update(organizationId, reminderId, input)
  if (!result) return sendWorkError(res, 'work/reminder-not-found')
  return sendWorkResult(res, result)
}

export async function deleteReminder(req: Request, res: Response) {
  const { organizationId, reminderId } = reminderParamsSchema.parse(req.params)
  const { deletedBy } = deleteReminderBodySchema.parse(req.body)
  const result = await service.remove(organizationId, reminderId, deletedBy)
  if (!result) return sendWorkError(res, 'work/reminder-not-found')
  return sendWorkResult(res, result)
}
