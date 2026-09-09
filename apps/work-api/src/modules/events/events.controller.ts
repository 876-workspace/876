import type { Request, Response } from 'express'
import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import { getPrincipal } from '../../http/auth/principal.js'
import * as recurrence from './events-recurrence.service.js'
import * as service from './events.service.js'
import {
  createEventBodySchema,
  deleteEventBodySchema,
  eventParamsSchema,
  listEventsQuerySchema,
  organizationParamsSchema,
  setEventRecurrenceBodySchema,
  updateEventBodySchema,
} from './events.schemas.js'

export async function listEvents(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  const q = listEventsQuerySchema.parse(req.query)
  const context = q.context_service
    ? {
        service: q.context_service,
        resource: q.context_resource!,
        id: q.context_id!,
      }
    : undefined
  return sendWorkList(
    res,
    await service.list(organizationId, {
      ...(q.calendar_id ? { calendarId: q.calendar_id } : {}),
      ...(context ? { context } : {}),
      ...(q.from ? { from: q.from } : {}),
      ...(q.to ? { to: q.to } : {}),
      ...(q.status ? { status: q.status } : {}),
      limit: q.limit,
      ...(q.starting_after ? { startingAfter: q.starting_after } : {}),
      ...(q.ending_before ? { endingBefore: q.ending_before } : {}),
    }),
    `/v1/organizations/${organizationId}/events`
  )
}

export async function retrieveEvent(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const result = await service.retrieve(organizationId, eventId)
  if (!result) return sendWorkError(res, 'work/event-not-found')
  return sendWorkResult(res, result)
}

export async function createEvent(req: Request, res: Response) {
  const { organizationId } = organizationParamsSchema.parse(req.params)
  return sendWorkResult(
    res,
    await service.create(organizationId, createEventBodySchema.parse(req.body)),
    201
  )
}

export async function updateEvent(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const result = await service.update(
    organizationId,
    eventId,
    updateEventBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/event-not-found')
  return sendWorkResult(res, result)
}

export async function retrieveEventRecurrence(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const result = await recurrence.retrieve(organizationId, eventId)
  if (!result) return sendWorkResult(res, null)
  return sendWorkResult(res, result)
}

export async function setEventRecurrence(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const principal = getPrincipal(req)
  if (principal.kind !== 'session' || !principal.userId)
    return sendWorkError(res, 'work/session-forbidden')

  const result = await recurrence.set(organizationId, eventId, {
    ...setEventRecurrenceBodySchema.parse(req.body),
    createdBy: principal.userId,
  })
  if (!result) return sendWorkError(res, 'work/event-not-found')
  return sendWorkResult(res, result)
}

export async function clearEventRecurrence(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const result = await recurrence.clear(organizationId, eventId)
  if (!result) return sendWorkError(res, 'work/event-not-found')
  return sendWorkResult(res, result)
}

export async function deleteEvent(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const { deletedBy } = deleteEventBodySchema.parse(req.body)
  const result = await service.remove(organizationId, eventId, deletedBy)
  if (!result) return sendWorkError(res, 'work/event-not-found')
  return sendWorkResult(res, result)
}
