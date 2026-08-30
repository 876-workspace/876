import type { Request, Response } from 'express'

import { sendCrmError, sendCrmList, sendCrmResult } from '../../http/result.js'
import * as service from './events.service.js'
import {
  createEventBodySchema,
  createParticipantBodySchema,
  deleteEventBodySchema,
  eventParamsSchema,
  participantParamsSchema,
  requestParamsSchema,
  updateEventBodySchema,
  updateParticipantBodySchema,
} from './events.schemas.js'

export async function listEvents(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const result = await service.list(organizationId, requestId)
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/requests/${requestId}/events`
  )
}

export async function retrieveEvent(req: Request, res: Response) {
  const { organizationId, id: requestId, eventId } = eventParamsSchema.parse(
    req.params
  )
  const result = await service.retrieve(organizationId, requestId, eventId)
  if (!result) return sendCrmError(res, 'crm/event-not-found')
  return sendCrmResult(res, result)
}

export async function createEvent(req: Request, res: Response) {
  const { organizationId, id: requestId } = requestParamsSchema.parse(req.params)
  const input = createEventBodySchema.parse(req.body)
  return sendCrmResult(
    res,
    await service.create(organizationId, requestId, input),
    201
  )
}

export async function updateEvent(req: Request, res: Response) {
  const { organizationId, id: requestId, eventId } = eventParamsSchema.parse(
    req.params
  )
  const input = updateEventBodySchema.parse(req.body)
  const result = await service.update(organizationId, requestId, eventId, input)
  if (!result) return sendCrmError(res, 'crm/event-not-found')
  return sendCrmResult(res, result)
}

export async function deleteEvent(req: Request, res: Response) {
  const { organizationId, id: requestId, eventId } = eventParamsSchema.parse(
    req.params
  )
  const { deletedBy } = deleteEventBodySchema.parse(req.body)
  const result = await service.remove(
    organizationId,
    requestId,
    eventId,
    deletedBy
  )
  if (!result) return sendCrmError(res, 'crm/event-not-found')
  return sendCrmResult(res, result)
}

export async function listParticipants(req: Request, res: Response) {
  const { organizationId, id: requestId, eventId } = eventParamsSchema.parse(
    req.params
  )
  const result = await service.listParticipants(
    organizationId,
    requestId,
    eventId
  )
  if (!result) return sendCrmError(res, 'crm/event-not-found')
  return sendCrmList(
    res,
    result,
    `/v1/organizations/${organizationId}/requests/${requestId}/events/${eventId}/participants`
  )
}

export async function createParticipant(req: Request, res: Response) {
  const { organizationId, id: requestId, eventId } = eventParamsSchema.parse(
    req.params
  )
  const input = createParticipantBodySchema.parse(req.body)
  const result = await service.createParticipant(
    organizationId,
    requestId,
    eventId,
    input
  )
  if (!result) return sendCrmError(res, 'crm/event-not-found')
  return sendCrmResult(res, result, 201)
}

export async function updateParticipant(req: Request, res: Response) {
  const { organizationId, id: requestId, eventId, participantId } =
    participantParamsSchema.parse(req.params)
  const input = updateParticipantBodySchema.parse(req.body)
  const result = await service.updateParticipant(
    organizationId,
    requestId,
    eventId,
    participantId,
    input
  )
  if (!result) return sendCrmError(res, 'crm/event-participant-not-found')
  return sendCrmResult(res, result)
}

export async function deleteParticipant(req: Request, res: Response) {
  const { organizationId, id: requestId, eventId, participantId } =
    participantParamsSchema.parse(req.params)
  const result = await service.removeParticipant(
    organizationId,
    requestId,
    eventId,
    participantId
  )
  if (!result) return sendCrmError(res, 'crm/event-participant-not-found')
  return sendCrmResult(res, result)
}
