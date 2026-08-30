import type { Request, Response } from 'express'

import { sendWorkError, sendWorkList, sendWorkResult } from '../../http/result.js'
import * as service from './calendars.service.js'
import {
  calendarParamsSchema,
  createCalendarBodySchema,
  deleteCalendarBodySchema,
  ensurePrimaryCalendarBodySchema,
  listCalendarsQuerySchema,
  organizationParamsSchema,
  updateCalendarBodySchema,
} from './calendars.schemas.js'

export async function listCalendars(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const query = listCalendarsQuerySchema.parse(req.query)
  return sendWorkList(
    res,
    await service.list(organizationId, {
      ...(query.user_id ? { userId: query.user_id } : {}),
      ...(query.visibility ? { visibility: query.visibility } : {}),
      limit: query.limit,
      ...(query.starting_after ? { startingAfter: query.starting_after } : {}),
      ...(query.ending_before ? { endingBefore: query.ending_before } : {}),
    }),
    `/v1/organizations/${organizationId}/calendars`
  )
}

export async function retrieveCalendar(req: Request, res: Response) {
  const { organizationId, calendarId } = calendarParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, calendarId)
  if (!result) return sendWorkError(res, 'work/calendar-not-found')
  return sendWorkResult(res, result)
}

export async function createCalendar(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkResult(
    res,
    await service.create(organizationId, createCalendarBodySchema.parse(req.body)),
    201
  )
}

export async function ensurePrimaryCalendar(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const { userId, timeZone } = ensurePrimaryCalendarBodySchema.parse(req.body)
  return sendWorkResult(
    res,
    await service.ensurePrimary(organizationId, userId, timeZone)
  )
}

export async function updateCalendar(req: Request, res: Response) {
  const { organizationId, calendarId } = calendarParamsSchema.parse(req.params)
  const result = await service.update(
    organizationId,
    calendarId,
    updateCalendarBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/calendar-not-found')
  return sendWorkResult(res, result)
}

export async function deleteCalendar(req: Request, res: Response) {
  const { organizationId, calendarId } = calendarParamsSchema.parse(req.params)
  const { deletedBy } = deleteCalendarBodySchema.parse(req.body)
  const result = await service.remove(organizationId, calendarId, deletedBy)
  if (!result) return sendWorkError(res, 'work/calendar-not-found')
  return sendWorkResult(res, result)
}
