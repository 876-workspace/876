import type { Request, Response } from 'express'

import {
  sendProjectsError,
  sendProjectsList,
  sendProjectsResult,
} from '../../http/result.js'
import { getSessionUserId } from '../../http/session-auth.js'
import * as service from './calendar.service.js'
import {
  addAttendeeBodySchema,
  attendeeParamsSchema,
  createEventBodySchema,
  createReminderBodySchema,
  dueRemindersQuerySchema,
  eventParamsSchema,
  listEventsQuerySchema,
  listRemindersQuerySchema,
  myWorkQuerySchema,
  organizationParamsSchema,
  parseCalendarQuery,
  parseDueRemindersQuery,
  reminderMutationQuerySchema,
  reminderParamsSchema,
  respondAttendeeBodySchema,
  updateEventBodySchema,
  updateReminderBodySchema,
} from './calendar.schemas.js'

export async function listEvents(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listEventsQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listEvents(params.organizationId, query),
    `/v1/organizations/${params.organizationId}/events`
  )
}

export async function createEvent(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createEvent(
      params.organizationId,
      createEventBodySchema.parse(req.body)
    ),
    201
  )
}

export async function retrieveEvent(req: Request, res: Response) {
  const params = eventParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.retrieveEvent(params.organizationId, params.eventId)
  )
}

export async function updateEvent(req: Request, res: Response) {
  const params = eventParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.updateEvent(
      params.organizationId,
      params.eventId,
      updateEventBodySchema.parse(req.body)
    )
  )
}

export async function removeEvent(req: Request, res: Response) {
  const params = eventParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeEvent(params.organizationId, params.eventId)
  )
}

export async function addAttendee(req: Request, res: Response) {
  const params = eventParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.addAttendee(
      params.organizationId,
      params.eventId,
      addAttendeeBodySchema.parse(req.body)
    ),
    201
  )
}

export async function respondAttendee(req: Request, res: Response) {
  const params = attendeeParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.respondAttendee(
      params.organizationId,
      params.eventId,
      params.userId,
      respondAttendeeBodySchema.parse(req.body)
    )
  )
}

export async function removeAttendee(req: Request, res: Response) {
  const params = attendeeParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.removeAttendee(
      params.organizationId,
      params.eventId,
      params.userId
    )
  )
}

export async function listReminders(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = listRemindersQuerySchema.parse(req.query)
  return sendProjectsList(
    res,
    await service.listReminders(params.organizationId, query.createdBy),
    `/v1/organizations/${params.organizationId}/reminders`
  )
}

export async function createReminder(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  return sendProjectsResult(
    res,
    await service.createReminder(
      params.organizationId,
      createReminderBodySchema.parse(req.body)
    ),
    201
  )
}

export async function updateReminder(req: Request, res: Response) {
  const params = reminderParamsSchema.parse(req.params)
  const query = reminderMutationQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.updateReminder(
      params.organizationId,
      params.reminderId,
      query.userId,
      updateReminderBodySchema.parse(req.body)
    )
  )
}

export async function removeReminder(req: Request, res: Response) {
  const params = reminderParamsSchema.parse(req.params)
  const query = reminderMutationQuerySchema.parse(req.query)
  return sendProjectsResult(
    res,
    await service.removeReminder(
      params.organizationId,
      params.reminderId,
      query.userId
    )
  )
}

export async function listDueReminders(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const raw = dueRemindersQuerySchema.parse(req.query)
  const query = parseDueRemindersQuery(raw)
  return sendProjectsList(
    res,
    await service.listDueReminders(params.organizationId, query.at, query.createdBy),
    `/v1/organizations/${params.organizationId}/reminders/due`
  )
}

export async function getCalendar(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = parseCalendarQuery({
    from: req.query.from,
    to: req.query.to,
    projectId: req.query.projectId,
    kinds: req.query.kinds,
  })
  return sendProjectsResult(
    res,
    await service.getCalendar(params.organizationId, query)
  )
}

export async function getMyWork(req: Request, res: Response) {
  const params = organizationParamsSchema.parse(req.params)
  const query = myWorkQuerySchema.parse(req.query)
  const sessionUserId = getSessionUserId(res)
  if (sessionUserId && query.userId !== sessionUserId)
    return sendProjectsError(res, 'projects/forbidden')
  return sendProjectsResult(
    res,
    await service.getMyWork(params.organizationId, query.userId)
  )
}
