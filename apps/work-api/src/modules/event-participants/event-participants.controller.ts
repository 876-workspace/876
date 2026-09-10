import type { Request, Response } from 'express'
import { getPrincipal } from '../../http/auth/principal.js'
import {
  sendWorkError,
  sendWorkList,
  sendWorkResult,
} from '../../http/result.js'
import * as service from './event-participants.service.js'
import {
  createParticipantBodySchema,
  eventParamsSchema,
  participantParamsSchema,
  participantResponseBodySchema,
  updateParticipantBodySchema,
} from './event-participants.schemas.js'
export async function listParticipants(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const result = await service.list(organizationId, eventId)
  if (!result) return sendWorkError(res, 'work/event-not-found')
  return sendWorkList(
    res,
    result,
    `/v1/organizations/${organizationId}/events/${eventId}/participants`
  )
}
export async function createParticipant(req: Request, res: Response) {
  const { organizationId, eventId } = eventParamsSchema.parse(req.params)
  const result = await service.create(
    organizationId,
    eventId,
    createParticipantBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/event-not-found')
  return sendWorkResult(res, result, 201)
}
export async function updateParticipant(req: Request, res: Response) {
  const { organizationId, eventId, participantId } =
    participantParamsSchema.parse(req.params)
  const result = await service.update(
    organizationId,
    eventId,
    participantId,
    updateParticipantBodySchema.parse(req.body)
  )
  if (!result) return sendWorkError(res, 'work/event-participant-not-found')
  return sendWorkResult(res, result)
}
export async function respondToParticipant(req: Request, res: Response) {
  const { organizationId, eventId, participantId } =
    participantParamsSchema.parse(req.params)
  const principal = getPrincipal(req)
  if (principal.kind !== 'session' || !principal.userId)
    return sendWorkError(res, 'work/session-forbidden')
  const { status } = participantResponseBodySchema.parse(req.body)
  const result = await service.respond(
    organizationId,
    eventId,
    participantId,
    principal.userId,
    status
  )
  if (!result) return sendWorkError(res, 'work/event-participant-not-found')
  return sendWorkResult(res, result)
}
export async function deleteParticipant(req: Request, res: Response) {
  const { organizationId, eventId, participantId } =
    participantParamsSchema.parse(req.params)
  const result = await service.remove(organizationId, eventId, participantId)
  if (!result) return sendWorkError(res, 'work/event-participant-not-found')
  return sendWorkResult(res, result)
}
