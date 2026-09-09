import { getError, isError } from '@876/core'
import type {
  CreateWorkEventParticipantInput,
  UpdateWorkEventParticipantInput,
  WorkEventParticipant,
  WorkEventParticipantResponseStatus,
} from '@876/work'
import * as events from '../events/index.js'
import * as repository from './event-participants.repository.js'
type Row = Awaited<ReturnType<typeof repository.list>>[number]
const stamp = (d: Date | null) => (d ? Math.floor(d.getTime() / 1000) : null)
function serialize(p: Row): WorkEventParticipant {
  return {
    object: 'event_participant',
    id: p.id,
    eventId: p.eventId,
    kind: p.kind,
    participantId: p.participantId,
    email: p.email,
    name: p.name,
    role: p.role,
    status: p.status,
    delegatedTo: p.delegatedTo,
    delegatedFrom: p.delegatedFrom,
    respondedAt: stamp(p.respondedAt),
    createdAt: stamp(p.createdAt)!,
    updatedAt: stamp(p.updatedAt)!,
  }
}
async function requireEvent(org: string, id: string) {
  const event = await events.retrieve(org, id)
  if (isError(event)) return event
  return event
}
export async function list(org: string, eventId: string) {
  const event = await requireEvent(org, eventId)
  if (!event || isError(event)) return event
  return {
    data: (await repository.list(eventId)).map(serialize),
    hasMore: false,
  }
}
export async function create(
  org: string,
  eventId: string,
  input: CreateWorkEventParticipantInput
) {
  const event = await requireEvent(org, eventId)
  if (!event || isError(event)) return event
  const row = await repository.create({
    eventId,
    kind: input.kind,
    participantId: input.participantId ?? null,
    email: input.email ?? null,
    name: input.name ?? null,
    role: input.role ?? 'REQUIRED',
    status: input.status ?? 'NEEDS_ACTION',
    delegatedTo: input.delegatedTo ?? null,
    delegatedFrom: input.delegatedFrom ?? null,
    respondedAt:
      input.status && input.status !== 'NEEDS_ACTION' ? new Date() : null,
  })
  return serialize(row)
}
export async function update(
  org: string,
  eventId: string,
  id: string,
  input: UpdateWorkEventParticipantInput
) {
  const event = await requireEvent(org, eventId)
  if (!event || isError(event)) return event
  const current = await repository.retrieve(eventId, id)
  if (!current) return null
  const row = await repository.update(id, {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.role === undefined ? {} : { role: input.role }),
    ...(input.status === undefined
      ? {}
      : {
          status: input.status,
          respondedAt: input.status === 'NEEDS_ACTION' ? null : new Date(),
        }),
    ...(input.delegatedTo === undefined
      ? {}
      : { delegatedTo: input.delegatedTo }),
    ...(input.delegatedFrom === undefined
      ? {}
      : { delegatedFrom: input.delegatedFrom }),
  })
  return serialize(row)
}

/** RSVP-like response for the exact signed-in USER participant. */
export async function respond(
  org: string,
  eventId: string,
  id: string,
  userId: string,
  status: WorkEventParticipantResponseStatus
) {
  const event = await requireEvent(org, eventId)
  if (!event || isError(event)) return event
  const current = await repository.retrieve(eventId, id)
  if (!current) return null
  if (current.kind !== 'USER' || current.participantId !== userId)
    return getError('work/session-forbidden')
  if (current.status === 'DELEGATED') return getError('work/invalid-request')
  if (current.status === status) return serialize(current)
  return serialize(
    await repository.update(id, {
      status,
      respondedAt: new Date(),
    })
  )
}

export async function remove(org: string, eventId: string, id: string) {
  const event = await requireEvent(org, eventId)
  if (!event || isError(event)) return event
  if (!(await repository.retrieve(eventId, id))) return null
  return repository.remove(id)
}
