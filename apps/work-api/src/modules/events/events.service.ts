import { getError, isError } from '@876/core'
import type {
  CreateWorkEventInput,
  UpdateWorkEventInput,
  WorkContext,
  WorkEventParticipant,
  WorkEventResource,
} from '@876/work'
import * as calendars from '../calendars/index.js'
import * as recurrenceRules from '../recurrence-rules/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './events.repository.js'
type Row = Awaited<ReturnType<typeof repository.list>>[number]
const stamp = (d: Date | null) => (d ? Math.floor(d.getTime() / 1000) : null)
const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)
const dateFromOnly = (s: string) => new Date(`${s}T00:00:00.000Z`)
function serializeParticipant(
  p: Row['participants'][number]
): WorkEventParticipant {
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
function serialize(row: Row, organizationId: string): WorkEventResource {
  const hasContext =
    row.contextService !== null &&
    row.contextResource !== null &&
    row.contextId !== null
  return {
    object: 'event' as const,
    id: row.id,
    uid: row.uid,
    organizationId,
    calendarId: row.calendarId,
    context: hasContext
      ? {
          service: row.contextService!,
          resource: row.contextResource!,
          id: row.contextId!,
        }
      : null,
    title: row.title,
    description: row.description,
    location: row.location,
    meetingUrl: row.meetingUrl,
    status: row.status,
    busyStatus: row.busyStatus,
    allDay: row.startDate !== null,
    startAt: stamp(row.startAt),
    endAt: stamp(row.endAt),
    timeZone: row.timeZone,
    startDate: dateOnly(row.startDate),
    endDate: dateOnly(row.endDate),
    recurrenceRuleId: row.recurrenceRuleId,
    recurrenceId: row.recurrenceId,
    participants: row.participants.map(serializeParticipant),
    createdBy: row.createdBy,
    createdAt: stamp(row.createdAt)!,
    updatedAt: stamp(row.updatedAt)!,
  }
}
async function requireTenant(organizationId: string) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('work/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('work/tenant-inactive')
  return tenant
}
async function requireRecurrenceRule(
  organizationId: string,
  recurrenceRuleId: string
) {
  const rule = await recurrenceRules.retrieve(organizationId, recurrenceRuleId)
  if (isError(rule)) return rule
  return rule ?? getError('work/recurrence-rule-not-found')
}
function contextColumns(context?: WorkContext | null) {
  if (!context)
    return { contextService: null, contextResource: null, contextId: null }
  return {
    contextService: context.service,
    contextResource: context.resource,
    contextId: context.id,
  }
}
export async function list(
  organizationId: string,
  filter: {
    calendarId?: string
    context?: WorkContext
    from?: number
    to?: number
    status?: string
    limit?: number
    startingAfter?: string
    endingBefore?: string
  } = {}
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const limit = filter.limit ?? 25
  const rows = await repository.list(tenant.id, {
    ...(filter.calendarId ? { calendarId: filter.calendarId } : {}),
    ...(filter.context
      ? {
          contextService: filter.context.service,
          contextResource: filter.context.resource,
          contextId: filter.context.id,
        }
      : {}),
    ...(filter.from ? { from: new Date(filter.from * 1000) } : {}),
    ...(filter.to ? { to: new Date(filter.to * 1000) } : {}),
    ...(filter.status ? { status: filter.status } : {}),
    limit,
    ...(filter.startingAfter ? { startingAfter: filter.startingAfter } : {}),
    ...(filter.endingBefore ? { endingBefore: filter.endingBefore } : {}),
  })
  const page = rows.slice(0, limit)
  return {
    data: (filter.endingBefore ? page.reverse() : page).map((r) =>
      serialize(r, organizationId)
    ),
    hasMore: rows.length > limit,
  }
}
export async function retrieve(organizationId: string, eventId: string) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const row = await repository.retrieve(tenant.id, eventId)
  return row ? serialize(row, organizationId) : null
}
export async function create(
  organizationId: string,
  input: CreateWorkEventInput & { context?: WorkContext | null }
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const calendar = await calendars.retrieve(organizationId, input.calendarId)
  if (!calendar || isError(calendar)) return getError('work/calendar-not-found')
  if (input.recurrenceRuleId) {
    const recurrence = await requireRecurrenceRule(
      organizationId,
      input.recurrenceRuleId
    )
    if (isError(recurrence)) return recurrence
  }
  const timed = input.allDay === false
  const row = await repository.create({
    tenantId: tenant.id,
    calendarId: input.calendarId,
    ...contextColumns(input.context),
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    meetingUrl: input.meetingUrl ?? null,
    status: input.status ?? 'CONFIRMED',
    busyStatus: input.busyStatus ?? 'BUSY',
    startAt: timed ? new Date(input.startAt * 1000) : null,
    endAt: timed ? new Date(input.endAt * 1000) : null,
    timeZone: timed ? input.timeZone : null,
    startDate: timed ? null : dateFromOnly(input.startDate),
    endDate: timed ? null : dateFromOnly(input.endDate),
    recurrenceRuleId: input.recurrenceRuleId ?? null,
    recurrenceId: input.recurrenceId ?? null,
    createdBy: input.createdBy,
  })
  return serialize(row, organizationId)
}
export async function update(
  organizationId: string,
  eventId: string,
  input: UpdateWorkEventInput & { context?: WorkContext | null }
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  const current = await repository.retrieve(tenant.id, eventId)
  if (!current) return null
  if (input.calendarId) {
    const calendar = await calendars.retrieve(organizationId, input.calendarId)
    if (!calendar || isError(calendar))
      return getError('work/calendar-not-found')
  }
  if (input.recurrenceRuleId) {
    const recurrence = await requireRecurrenceRule(
      organizationId,
      input.recurrenceRuleId
    )
    if (isError(recurrence)) return recurrence
  }
  const nextAllDay = input.allDay ?? current.startDate !== null
  const params: Record<string, unknown> = {
    ...(input.context === undefined ? {} : contextColumns(input.context)),
    ...(input.calendarId === undefined ? {} : { calendarId: input.calendarId }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.description === undefined
      ? {}
      : { description: input.description }),
    ...(input.location === undefined ? {} : { location: input.location }),
    ...(input.meetingUrl === undefined ? {} : { meetingUrl: input.meetingUrl }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.busyStatus === undefined ? {} : { busyStatus: input.busyStatus }),
    ...(input.recurrenceRuleId === undefined
      ? {}
      : { recurrenceRuleId: input.recurrenceRuleId }),
    ...(input.recurrenceId === undefined
      ? {}
      : { recurrenceId: input.recurrenceId }),
  }
  if (nextAllDay) {
    const startDate = input.startDate ?? dateOnly(current.startDate)
    const endDate = input.endDate ?? dateOnly(current.endDate)
    if (!startDate || !endDate || endDate <= startDate)
      return getError('work/invalid-request')
    Object.assign(params, {
      startAt: null,
      endAt: null,
      timeZone: null,
      startDate: dateFromOnly(startDate),
      endDate: dateFromOnly(endDate),
    })
  } else {
    const startAt = input.startAt ?? stamp(current.startAt)
    const endAt = input.endAt ?? stamp(current.endAt)
    const timeZone = input.timeZone ?? current.timeZone
    if (startAt == null || endAt == null || !timeZone || endAt <= startAt)
      return getError('work/invalid-request')
    Object.assign(params, {
      startAt: new Date(startAt * 1000),
      endAt: new Date(endAt * 1000),
      timeZone,
      startDate: null,
      endDate: null,
    })
  }
  return serialize(
    await repository.update(eventId, params as never),
    organizationId
  )
}
export async function remove(
  organizationId: string,
  eventId: string,
  deletedBy: string
) {
  const tenant = await requireTenant(organizationId)
  if (isError(tenant)) return tenant
  if (!(await repository.retrieve(tenant.id, eventId))) return null
  return repository.remove(eventId, deletedBy)
}
