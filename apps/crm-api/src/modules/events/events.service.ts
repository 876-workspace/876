import { getError, isError } from '@876/core'
import type { WorkEventParticipant, WorkEventResource } from '@876/work'

import {
  crmRequestWorkContext,
  workClient,
  workErrorToCrm,
} from '../../providers/work.js'
import type {
  CreateEventInput,
  CreateEventParticipantInput,
  RequestEvent,
  RequestEventParticipant,
  UpdateEventInput,
  UpdateEventParticipantInput,
} from '../../types/event.js'
import { requireRequestContext } from '../requests/index.js'

function serializeParticipant(
  participant: WorkEventParticipant
): RequestEventParticipant {
  return {
    object: 'request_event_participant',
    id: participant.id,
    eventId: participant.eventId,
    kind: participant.kind,
    participantId: participant.participantId,
    email: participant.email,
    name: participant.name,
    role: participant.role,
    status: participant.status,
    delegatedTo: participant.delegatedTo,
    delegatedFrom: participant.delegatedFrom,
    respondedAt: participant.respondedAt,
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
  }
}

function serialize(
  event: WorkEventResource,
  tenantId: string,
  requestId: string
): RequestEvent {
  return {
    object: 'request_event',
    id: event.id,
    uid: event.uid,
    tenantId,
    requestId,
    calendarId: event.calendarId,
    title: event.title,
    description: event.description,
    location: event.location,
    status: event.status,
    busyStatus: event.busyStatus,
    allDay: event.allDay,
    startAt: event.startAt,
    endAt: event.endAt,
    timeZone: event.timeZone,
    startDate: event.startDate,
    endDate: event.endDate,
    recurrenceRuleId: event.recurrenceRuleId,
    recurrenceId: event.recurrenceId,
    participants: event.participants.map(serializeParticipant),
    createdBy: event.createdBy,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }
}

function belongsToRequest(event: WorkEventResource, requestId: string) {
  const context = crmRequestWorkContext(requestId)
  return (
    event.context?.service === context.service &&
    event.context?.resource === context.resource &&
    event.context?.id === context.id
  )
}

async function listWorkEvents(organizationId: string, requestId: string) {
  const events: WorkEventResource[] = []
  let startingAfter: string | undefined

  for (let page = 0; page < 20; page += 1) {
    const result = await workClient().events.list(organizationId, {
      context: crmRequestWorkContext(requestId),
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (result.error) return workErrorToCrm(result.error)

    events.push(...result.data.data)
    if (!result.data.has_more) return events
    const last = result.data.data.at(-1)
    if (!last) return getError('crm/work-invalid-response')
    startingAfter = last.id
  }

  return getError('crm/work-invalid-response')
}

async function findWorkEvent(
  organizationId: string,
  requestId: string,
  eventId: string
) {
  const result = await workClient().events.retrieve(organizationId, eventId)
  if (result.error?.code === 'work/event-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return belongsToRequest(result.data, requestId) ? result.data : null
}

async function resolveCalendarId(
  organizationId: string,
  input: CreateEventInput
) {
  if (input.calendarId) return input.calendarId

  const timeZone = input.allDay
    ? (input.calendarTimeZone ?? 'UTC')
    : input.timeZone
  const result = await workClient().calendars.ensurePrimary(organizationId, {
    userId: input.createdBy,
    timeZone,
  })
  return result.error ? workErrorToCrm(result.error) : result.data.id
}

export async function list(organizationId: string, requestId: string) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const result = await listWorkEvents(organizationId, requestId)
  if (isError(result)) return result
  return result.map((event) => serialize(event, context.tenantId, requestId))
}

export async function retrieve(
  organizationId: string,
  requestId: string,
  eventId: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const event = await findWorkEvent(organizationId, requestId, eventId)
  if (!event || isError(event)) return event
  return serialize(event, context.tenantId, requestId)
}

export async function create(
  organizationId: string,
  requestId: string,
  input: CreateEventInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const calendarId = await resolveCalendarId(organizationId, input)
  if (isError(calendarId)) return calendarId

  const common = {
    calendarId,
    context: crmRequestWorkContext(requestId),
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    status: input.status,
    busyStatus: input.busyStatus,
    recurrenceRuleId: input.recurrenceRuleId ?? null,
    recurrenceId: input.recurrenceId ?? null,
    createdBy: input.createdBy,
  }
  const eventInput = input.allDay
    ? {
        ...common,
        allDay: true as const,
        startDate: input.startDate,
        endDate: input.endDate,
      }
    : {
        ...common,
        allDay: false as const,
        startAt: input.startAt,
        endAt: input.endAt,
        timeZone: input.timeZone,
      }

  const result = await workClient().events.create(organizationId, eventInput)
  if (result.error) return workErrorToCrm(result.error)
  return serialize(result.data, context.tenantId, requestId)
}

export async function update(
  organizationId: string,
  requestId: string,
  eventId: string,
  input: UpdateEventInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const current = await findWorkEvent(organizationId, requestId, eventId)
  if (!current || isError(current)) return current

  const result = await workClient().events.update(
    organizationId,
    eventId,
    input
  )
  if (result.error?.code === 'work/event-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return serialize(result.data, context.tenantId, requestId)
}

export async function remove(
  organizationId: string,
  requestId: string,
  eventId: string,
  deletedBy: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const current = await findWorkEvent(organizationId, requestId, eventId)
  if (!current || isError(current)) return current

  const result = await workClient().events.delete(
    organizationId,
    eventId,
    deletedBy
  )
  if (result.error?.code === 'work/event-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return {
    object: 'request_event' as const,
    id: eventId,
    deleted: true as const,
  }
}

export async function listParticipants(
  organizationId: string,
  requestId: string,
  eventId: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const event = await findWorkEvent(organizationId, requestId, eventId)
  if (!event || isError(event)) return event
  const result = await workClient().eventParticipants.list(
    organizationId,
    eventId
  )
  if (result.error) return workErrorToCrm(result.error)
  return result.data.data.map(serializeParticipant)
}

export async function createParticipant(
  organizationId: string,
  requestId: string,
  eventId: string,
  input: CreateEventParticipantInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const event = await findWorkEvent(organizationId, requestId, eventId)
  if (!event || isError(event)) return event
  const result = await workClient().eventParticipants.create(
    organizationId,
    eventId,
    input
  )
  return result.error
    ? workErrorToCrm(result.error)
    : serializeParticipant(result.data)
}

async function hasParticipant(
  organizationId: string,
  eventId: string,
  participantId: string
) {
  const result = await workClient().eventParticipants.list(
    organizationId,
    eventId
  )
  if (result.error) return workErrorToCrm(result.error)
  return result.data.data.some(
    (participant) => participant.id === participantId
  )
}

export async function updateParticipant(
  organizationId: string,
  requestId: string,
  eventId: string,
  participantId: string,
  input: UpdateEventParticipantInput
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const event = await findWorkEvent(organizationId, requestId, eventId)
  if (!event || isError(event)) return event
  const exists = await hasParticipant(organizationId, eventId, participantId)
  if (isError(exists)) return exists
  if (!exists) return null

  const result = await workClient().eventParticipants.update(
    organizationId,
    eventId,
    participantId,
    input
  )
  if (result.error?.code === 'work/event-participant-not-found') return null
  return result.error
    ? workErrorToCrm(result.error)
    : serializeParticipant(result.data)
}

export async function removeParticipant(
  organizationId: string,
  requestId: string,
  eventId: string,
  participantId: string
) {
  const context = await requireRequestContext(organizationId, requestId)
  if (isError(context)) return context
  const event = await findWorkEvent(organizationId, requestId, eventId)
  if (!event || isError(event)) return event
  const exists = await hasParticipant(organizationId, eventId, participantId)
  if (isError(exists)) return exists
  if (!exists) return null

  const result = await workClient().eventParticipants.delete(
    organizationId,
    eventId,
    participantId
  )
  if (result.error?.code === 'work/event-participant-not-found') return null
  if (result.error) return workErrorToCrm(result.error)
  return {
    object: 'request_event_participant' as const,
    id: participantId,
    deleted: true as const,
  }
}
