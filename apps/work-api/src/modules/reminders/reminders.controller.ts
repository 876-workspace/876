import type { Request, Response } from 'express'
import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import { getPrincipal } from '../../http/auth/principal.js'
import * as recurrence from './reminders-recurrence.service.js'
import * as service from './reminders.service.js'
import {
  createReminderBodySchema,
  deleteReminderBodySchema,
  listRemindersQuerySchema,
  organizationParamsSchema,
  reminderParamsSchema,
  setReminderRecurrenceBodySchema,
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
    ...(query.status ? { status: query.status } : {}),
    limit: query.limit,
    ...(query.starting_after ? { startingAfter: query.starting_after } : {}),
    ...(query.ending_before ? { endingBefore: query.ending_before } : {}),
  })
  return sendWorkList(
    res,
    result,
    `/v1/organizations/${organizationId}/reminders`
  )
}

export async function retrieveReminder(req: Request, res: Response) {
  const { organizationId, reminderId } = reminderParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, reminderId)
  if (!result) return sendWorkError(res, 'work/reminder-not-found')
  return sendWorkResult(res, result)
}

export async function createReminder(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkResult(
    res,
    await service.create(
      organizationId,
      createReminderBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateReminder(req: Request, res: Response) {
  const { organizationId, reminderId } = reminderParamsSchema.parse(req.params)
  const result = await service.update(
    organizationId,
    reminderId,
    updateReminderBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/reminder-not-found')
  return sendWorkResult(res, result)
}

export async function retrieveReminderRecurrence(req: Request, res: Response) {
  const { organizationId, reminderId } = reminderParamsSchema.parse(req.params)
  const result = await recurrence.retrieve(organizationId, reminderId)
  if (!result) return sendWorkResult(res, null)
  return sendWorkResult(res, result)
}

export async function setReminderRecurrence(req: Request, res: Response) {
  const { organizationId, reminderId } = reminderParamsSchema.parse(req.params)
  const principal = getPrincipal(req)
  if (principal.kind !== 'session' || !principal.userId)
    return sendWorkError(res, 'work/session-forbidden')

  const result = await recurrence.set(organizationId, reminderId, {
    ...setReminderRecurrenceBodySchema.parse(req.body),
    createdBy: principal.userId,
  })
  if (!result) return sendWorkError(res, 'work/reminder-not-found')
  return sendWorkResult(res, result)
}

export async function clearReminderRecurrence(req: Request, res: Response) {
  const { organizationId, reminderId } = reminderParamsSchema.parse(req.params)
  const result = await recurrence.clear(organizationId, reminderId)
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
