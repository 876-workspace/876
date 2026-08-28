import type { Request, Response } from 'express'

import * as service from './reminders.service.js'
import {
  createReminderBodySchema,
  deleteReminderBodySchema,
  reminderParamsSchema,
  requestParamsSchema,
  updateReminderBodySchema,
} from './reminders.schemas.js'

function notFound(res: Response) {
  return res.status(404).json({
    data: null,
    error: {
      code: 'crm/reminder-not-found',
      message: 'Request reminder not found.',
    },
  })
}

export async function listReminders(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const data = await service.list(organizationId, requestId)

  res.json({
    data: {
      object: 'list',
      data,
      has_more: false,
      total_count: data.length,
      url: `/v1/organizations/${organizationId}/requests/${requestId}/reminders`,
    },
    error: null,
  })
}

export async function createReminder(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const input = createReminderBodySchema.parse(req.body)

  res.status(201).json({
    data: await service.create(organizationId, requestId, input),
    error: null,
  })
}

export async function updateReminder(req: Request, res: Response) {
  const { organizationId, id: requestId, reminderId } =
    reminderParamsSchema.parse(req.params)
  const input = updateReminderBodySchema.parse(req.body)
  const data = await service.update(
    organizationId,
    requestId,
    reminderId,
    input
  )
  if (!data) return notFound(res)

  res.json({ data, error: null })
}

export async function deleteReminder(req: Request, res: Response) {
  const { organizationId, id: requestId, reminderId } =
    reminderParamsSchema.parse(req.params)
  const { deletedBy } = deleteReminderBodySchema.parse(req.body)
  const data = await service.remove(
    organizationId,
    requestId,
    reminderId,
    deletedBy
  )
  if (!data) return notFound(res)

  res.json({ data, error: null })
}
