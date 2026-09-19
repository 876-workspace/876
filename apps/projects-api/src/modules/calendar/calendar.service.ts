import type {
  WorkEventResource,
  WorkRecurrenceDraft,
  WorkRecurrenceRule,
  WorkReminder,
} from '@876/work'

import { getError, type ProjectsError } from '../../http/errors.js'
import {
  PROJECTS_SYSTEM_ACTOR,
  projectsEventWorkContext,
  projectsIssueWorkContext,
  projectsMilestoneWorkContext,
  projectsProjectWorkContext,
  resolveProjectsCalendarId,
  workClient,
  workErrorToProjects,
} from '../../providers/work.js'
import { nowUnixSeconds, nullableFromDbUnixSeconds, toDbUnixSeconds } from '../../platform/timestamps.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './calendar.repository.js'
import type { CalendarIssueRow, UpdateEventLinkParams } from './calendar.repository.js'
import { expandOccurrences, type RecurrenceRule } from './recurrence.js'
import {
  serializeDueReminder,
  serializeReminder,
  serializeWorkAttendee,
  serializeWorkEvent,
  workReminderTarget,
  workRuleToRecurrenceRule,
  type CalendarEntryKind,
  type ProjectEventLinkRow,
  type SerializedAttendee,
  type SerializedCalendar,
  type SerializedCalendarEntry,
  type SerializedDueReminder,
  type SerializedEvent,
  type SerializedMyWork,
  type SerializedMyWorkIssue,
  type SerializedReminder,
} from './calendar.serializers.js'
import type {
  AddAttendeeBody,
  CalendarQuery,
  CreateEventBody,
  CreateReminderBody,
  ListEventsQuery,
  RespondAttendeeBody,
  UpdateEventBody,
  UpdateReminderBody,
} from './calendar.schemas.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

type TenantResolution =
  | { tenant: { id: string }; error: null }
  | { tenant: null; error: ProjectsError }

async function resolveTenant(
  organizationId: string
): Promise<TenantResolution> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

function eventRecurrenceRule(event: SerializedEvent): RecurrenceRule | null {
  if (!event.recurrence) return null
  return {
    freq: event.recurrence.freq as RecurrenceRule['freq'],
    interval: event.recurrence.interval,
    byWeekday: event.recurrence.byWeekday,
    until: event.recurrence.until,
    count: event.recurrence.count,
    startsAt: event.startsAt,
    durationSeconds:
      event.endsAt === null ? null : Math.max(0, event.endsAt - event.startsAt),
  }
}

type RecurrencePatch = {
  freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval?: number | null
  byWeekday?: number[] | null
  until?: number | null
  count?: number | null
}

const PROJECTS_FREQUENCY_TO_WORK = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
} as const

const PROJECT_WEEKDAY_TO_WORK_DAY = [
  'SU',
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
] as const

function workContextForTarget(target: {
  issueId?: string | null
  milestoneId?: string | null
  eventId?: string | null
}) {
  if (target.issueId) return projectsIssueWorkContext(target.issueId)
  if (target.milestoneId)
    return projectsMilestoneWorkContext(target.milestoneId)
  if (target.eventId) return projectsEventWorkContext(target.eventId)
  return undefined
}

// Work requires a title while Projects reminders never had one. The title is
// derived deterministically from the reminder target and never surfaces in
// the Projects contract.
function reminderTitleForTarget(target: {
  issueId?: string | null
  milestoneId?: string | null
  eventId?: string | null
}): string {
  if (target.issueId) return 'Issue reminder'
  if (target.milestoneId) return 'Milestone reminder'
  if (target.eventId) return 'Event reminder'
  return 'Projects reminder'
}

function workDaysFromPatch(
  byWeekday: number[] | null | undefined,
  fallback: WorkRecurrenceRule | null
): WorkRecurrenceDraft['byDay'] | undefined {
  if (byWeekday === undefined)
    return fallback && fallback.byDay.length > 0 ? fallback.byDay : undefined
  if (byWeekday === null) return undefined
  return byWeekday.map((day) => PROJECT_WEEKDAY_TO_WORK_DAY[day])
}

function toWorkRecurrenceDraft(
  input: RecurrencePatch,
  fallback: WorkRecurrenceRule | null = null
): WorkRecurrenceDraft {
  return {
    frequency: PROJECTS_FREQUENCY_TO_WORK[input.freq],
    interval:
      input.interval === undefined || input.interval === null
        ? (fallback?.interval ?? 1)
        : input.interval,
    ...(workDaysFromPatch(input.byWeekday, fallback) === undefined
      ? {}
      : { byDay: workDaysFromPatch(input.byWeekday, fallback) }),
    ...(input.until === undefined
      ? fallback
        ? { untilAt: fallback.untilAt }
        : {}
      : { untilAt: input.until }),
    ...(input.count === undefined
      ? fallback
        ? { count: fallback.count }
        : {}
      : { count: input.count }),
    timeZone: fallback?.timeZone ?? 'UTC',
  }
}

type WorkReminderPage =
  | { reminders: WorkReminder[]; error: null }
  | { reminders: null; error: ProjectsError }

async function listProjectReminders(
  organizationId: string,
  filter: { userId?: string; status?: WorkReminder['status'] } = {}
): Promise<WorkReminderPage> {
  const output: WorkReminder[] = []
  let startingAfter: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const result = await workClient().reminders.list(organizationId, {
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (result.error)
      return { reminders: null, error: workErrorToProjects(result.error) }
    for (const reminder of result.data.data) {
      if (reminder.context?.service === 'projects') output.push(reminder)
    }
    if (!result.data.has_more) return { reminders: output, error: null }
    const last = result.data.data.at(-1)
    if (!last)
      return { reminders: null, error: getError('projects/internal-error') }
    startingAfter = last.id
  }
  return { reminders: null, error: getError('projects/internal-error') }
}

type WorkRuleResult =
  | { rule: WorkRecurrenceRule | null; error: null }
  | { rule: null; error: ProjectsError }

async function retrieveWorkRule(
  organizationId: string,
  reminderId: string
): Promise<WorkRuleResult> {
  const result = await workClient().reminders.recurrence.retrieve(
    organizationId,
    reminderId
  )
  if (result.error)
    return { rule: null, error: workErrorToProjects(result.error) }
  return { rule: result.data, error: null }
}

async function retrieveWorkEventRule(
  organizationId: string,
  eventId: string
): Promise<WorkRuleResult> {
  const result = await workClient().events.recurrence.retrieve(
    organizationId,
    eventId
  )
  if (result.error)
    return { rule: null, error: workErrorToProjects(result.error) }
  return { rule: result.data, error: null }
}

function belongsToProjectEvent(
  event: WorkEventResource,
  link: ProjectEventLinkRow
): boolean {
  const context = event.context
  return (
    context?.service === 'projects' &&
    context.resource === 'project' &&
    context.id === link.projectId
  )
}

async function serializeProjectWorkEvent(
  organizationId: string,
  event: WorkEventResource,
  link: ProjectEventLinkRow
): Promise<ServiceResult<SerializedEvent>> {
  const rule = await retrieveWorkEventRule(organizationId, event.id)
  if (rule.error) return { data: null, error: rule.error }
  return { data: serializeWorkEvent(event, link, rule.rule), error: null }
}

async function findProjectWorkEvent(
  organizationId: string,
  tenantId: string,
  eventId: string
): Promise<
  | { event: WorkEventResource; link: ProjectEventLinkRow; error: null }
  | { event: null; link: null; error: ProjectsError }
> {
  const link = await repository.retrieveEventLink(tenantId, eventId)
  if (!link)
    return { event: null, link: null, error: getError('projects/event-not-found') }
  const result = await workClient().events.retrieve(organizationId, eventId)
  if (result.error)
    return { event: null, link: null, error: workErrorToProjects(result.error) }
  if (!belongsToProjectEvent(result.data, link))
    return { event: null, link: null, error: getError('projects/event-not-found') }
  return { event: result.data, link, error: null }
}

function dateOnlyFromUnixSeconds(value: number): string {
  return new Date(value * 1000).toISOString().slice(0, 10)
}

function unixSecondsFromDateOnly(value: string): number {
  return Math.floor(new Date(`${value}T00:00:00.000Z`).getTime() / 1000)
}

function workEventTiming(input: {
  startsAt: number
  endsAt?: number | null
  allDay?: boolean
}) {
  if (input.allDay) {
    const startDate = dateOnlyFromUnixSeconds(input.startsAt)
    const endDate = dateOnlyFromUnixSeconds(
      input.endsAt ?? input.startsAt + 86400
    )
    return { allDay: true as const, startDate, endDate }
  }
  return {
    allDay: false as const,
    startAt: input.startsAt,
    endAt: input.endsAt ?? input.startsAt + 1,
    timeZone: 'UTC',
  }
}

const PROJECTS_ATTENDEE_TO_WORK = {
  invited: 'NEEDS_ACTION',
  accepted: 'ACCEPTED',
  declined: 'DECLINED',
  tentative: 'TENTATIVE',
} as const

export async function listEvents(
  organizationId: string,
  query: ListEventsQuery
): Promise<ServiceResult<SerializedEvent[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const links = await repository.listEventLinks(
    resolved.tenant.id,
    query.projectId
  )
  const linksByEventId = new Map(links.map((link) => [link.eventId, link]))
  const events: WorkEventResource[] = []
  let startingAfter: string | undefined
  for (let page = 0; page < 20; page += 1) {
    const result = await workClient().events.list(organizationId, {
      ...(query.projectId
        ? { context: projectsProjectWorkContext(query.projectId) }
        : {}),
      limit: 100,
      ...(startingAfter ? { startingAfter } : {}),
    })
    if (result.error)
      return { data: null, error: workErrorToProjects(result.error) }
    events.push(...result.data.data)
    if (!result.data.has_more) break
    const last = result.data.data.at(-1)
    if (!last) return { data: null, error: getError('projects/internal-error') }
    startingAfter = last.id
  }
  if (startingAfter && events.length >= 2000)
    return { data: null, error: getError('projects/internal-error') }

  const data: SerializedEvent[] = []
  for (const event of events) {
    const link = linksByEventId.get(event.id)
    if (!link || !belongsToProjectEvent(event, link)) continue
    const serialized = await serializeProjectWorkEvent(organizationId, event, link)
    if (serialized.error) return serialized
    data.push(serialized.data)
  }
  data.sort((a, b) => a.startsAt - b.startsAt || a.id.localeCompare(b.id))
  return { data, error: null }
}

export async function createEvent(
  organizationId: string,
  body: CreateEventBody
): Promise<ServiceResult<SerializedEvent>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    body.projectId
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const createdBy = body.createdBy ?? PROJECTS_SYSTEM_ACTOR
  const calendarId = await resolveProjectsCalendarId(organizationId, createdBy)
  if (typeof calendarId !== 'string') return { data: null, error: calendarId }
  const created = await workClient().events.create(organizationId, {
    calendarId,
    context: projectsProjectWorkContext(project.id),
    title: body.title,
    description: body.description ?? null,
    location: body.location ?? null,
    meetingUrl: body.meetingUrl ?? null,
    createdBy,
    ...workEventTiming(body),
  })
  if (created.error)
    return { data: null, error: workErrorToProjects(created.error) }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const link = await repository.createEventLink({
    eventId: created.data.id,
    tenantId: resolved.tenant.id,
    projectId: project.id,
    milestoneId: body.milestoneId ?? null,
    issueId: body.issueId ?? null,
    kind: body.kind ?? 'event',
    createdAt: now,
    updatedAt: now,
  })
  let rule: WorkRecurrenceRule | null = null
  if (body.recurrence) {
    const set = await workClient().events.recurrence.set(
      organizationId,
      created.data.id,
      toWorkRecurrenceDraft(body.recurrence)
    )
    if (set.error) return { data: null, error: workErrorToProjects(set.error) }
    rule = set.data
  }
  return { data: serializeWorkEvent(created.data, link, rule), error: null }
}

export async function retrieveEvent(
  organizationId: string,
  eventId: string
): Promise<ServiceResult<SerializedEvent>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const found = await findProjectWorkEvent(
    organizationId,
    resolved.tenant.id,
    eventId
  )
  if (found.error) return { data: null, error: found.error }
  return serializeProjectWorkEvent(organizationId, found.event, found.link)
}

export async function updateEvent(
  organizationId: string,
  eventId: string,
  body: UpdateEventBody
): Promise<ServiceResult<SerializedEvent>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const found = await findProjectWorkEvent(
    organizationId,
    resolved.tenant.id,
    eventId
  )
  if (found.error) return { data: null, error: found.error }
  const current = serializeWorkEvent(found.event, found.link, null)
  const eventPatch = {
    ...(body.title !== undefined ? { title: body.title } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.location !== undefined ? { location: body.location } : {}),
    ...(body.meetingUrl !== undefined ? { meetingUrl: body.meetingUrl } : {}),
  }
  const timingTouched =
    body.startsAt !== undefined ||
    body.endsAt !== undefined ||
    body.allDay !== undefined
  if (timingTouched)
    Object.assign(
      eventPatch,
      workEventTiming({
        startsAt: body.startsAt ?? current.startsAt,
        endsAt: body.endsAt === undefined ? current.endsAt : body.endsAt,
        allDay: body.allDay ?? current.allDay,
      })
    )
  let updated = found.event
  if (Object.keys(eventPatch).length > 0) {
    const result = await workClient().events.update(
      organizationId,
      eventId,
      eventPatch
    )
    if (result.error)
      return { data: null, error: workErrorToProjects(result.error) }
    updated = result.data
  }
  const linkPatch: UpdateEventLinkParams = {
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  }
  if (body.milestoneId !== undefined) linkPatch.milestoneId = body.milestoneId
  if (body.issueId !== undefined) linkPatch.issueId = body.issueId
  if (body.kind !== undefined) linkPatch.kind = body.kind
  const link = await repository.updateEventLink(
    resolved.tenant.id,
    eventId,
    linkPatch
  )
  let rule: WorkRecurrenceRule | null = null
  if (body.recurrence === null) {
    const cleared = await workClient().events.recurrence.clear(
      organizationId,
      eventId
    )
    if (cleared.error)
      return { data: null, error: workErrorToProjects(cleared.error) }
    updated = cleared.data
  } else if (body.recurrence !== undefined) {
    const previous = await retrieveWorkEventRule(organizationId, eventId)
    if (previous.error) return { data: null, error: previous.error }
    const set = await workClient().events.recurrence.set(
      organizationId,
      eventId,
      toWorkRecurrenceDraft(body.recurrence, previous.rule)
    )
    if (set.error) return { data: null, error: workErrorToProjects(set.error) }
    rule = set.data
  } else {
    const currentRule = await retrieveWorkEventRule(organizationId, eventId)
    if (currentRule.error) return { data: null, error: currentRule.error }
    rule = currentRule.rule
  }
  return { data: serializeWorkEvent(updated, link, rule), error: null }
}

export async function removeEvent(
  organizationId: string,
  eventId: string
): Promise<
  ServiceResult<{ object: 'projects.event'; id: string; deleted: true }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const found = await findProjectWorkEvent(
    organizationId,
    resolved.tenant.id,
    eventId
  )
  if (found.error) return { data: null, error: found.error }
  const deleted = await workClient().events.delete(
    organizationId,
    eventId,
    found.event.createdBy
  )
  if (deleted.error)
    return { data: null, error: workErrorToProjects(deleted.error) }
  await repository.deleteEventLink(resolved.tenant.id, eventId)
  return {
    data: { object: 'projects.event', id: eventId, deleted: true },
    error: null,
  }
}

export async function addAttendee(
  organizationId: string,
  eventId: string,
  body: AddAttendeeBody
): Promise<ServiceResult<SerializedAttendee>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const found = await findProjectWorkEvent(
    organizationId,
    resolved.tenant.id,
    eventId
  )
  if (found.error) return { data: null, error: found.error }
  const existing = found.event.participants.find(
    (participant) =>
      participant.kind === 'USER' && participant.participantId === body.userId
  )
  if (existing)
    return { data: null, error: getError('projects/attendee-exists') }
  const created = await workClient().eventParticipants.create(organizationId, eventId, {
    kind: 'USER',
    participantId: body.userId,
    status: PROJECTS_ATTENDEE_TO_WORK[body.response ?? 'invited'],
  })
  if (created.error)
    return { data: null, error: workErrorToProjects(created.error) }
  const attendee = serializeWorkAttendee(created.data)
  if (!attendee) return { data: null, error: getError('projects/internal-error') }
  return { data: attendee, error: null }
}

export async function respondAttendee(
  organizationId: string,
  eventId: string,
  userId: string,
  body: RespondAttendeeBody
): Promise<ServiceResult<SerializedAttendee>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const found = await findProjectWorkEvent(
    organizationId,
    resolved.tenant.id,
    eventId
  )
  if (found.error) return { data: null, error: found.error }
  const existing = found.event.participants.find(
    (participant) => participant.kind === 'USER' && participant.participantId === userId
  )
  if (!existing)
    return { data: null, error: getError('projects/attendee-not-found') }
  const updated = await workClient().eventParticipants.update(
    organizationId,
    eventId,
    existing.id,
    { status: PROJECTS_ATTENDEE_TO_WORK[body.response] }
  )
  if (updated.error)
    return { data: null, error: workErrorToProjects(updated.error) }
  const attendee = serializeWorkAttendee(updated.data)
  if (!attendee) return { data: null, error: getError('projects/internal-error') }
  return { data: attendee, error: null }
}

export async function removeAttendee(
  organizationId: string,
  eventId: string,
  userId: string
): Promise<
  ServiceResult<{
    object: 'projects.event-attendee'
    id: string
    deleted: true
  }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const found = await findProjectWorkEvent(
    organizationId,
    resolved.tenant.id,
    eventId
  )
  if (found.error) return { data: null, error: found.error }
  const existing = found.event.participants.find(
    (participant) => participant.kind === 'USER' && participant.participantId === userId
  )
  if (!existing)
    return { data: null, error: getError('projects/attendee-not-found') }
  const deleted = await workClient().eventParticipants.delete(
    organizationId,
    eventId,
    existing.id
  )
  if (deleted.error)
    return { data: null, error: workErrorToProjects(deleted.error) }
  return {
    data: { object: 'projects.event-attendee', id: existing.id, deleted: true },
    error: null,
  }
}

function checkReminderOwner(
  reminder: WorkReminder,
  userId: string
): ProjectsError | null {
  if (reminder.createdBy !== userId)
    return getError('projects/reminder-forbidden')
  return null
}

export async function listReminders(
  organizationId: string,
  createdBy: string
): Promise<ServiceResult<SerializedReminder[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const page = await listProjectReminders(organizationId, {
    userId: createdBy,
  })
  if (page.error) return { data: null, error: page.error }
  const data: SerializedReminder[] = []
  for (const reminder of page.reminders) {
    if (reminder.createdBy !== createdBy) continue
    const rule = await retrieveWorkRule(organizationId, reminder.id)
    if (rule.error) return { data: null, error: rule.error }
    data.push(serializeReminder(reminder, resolved.tenant.id, rule.rule))
  }
  return { data, error: null }
}

export async function createReminder(
  organizationId: string,
  body: CreateReminderBody
): Promise<ServiceResult<SerializedReminder>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const created = await workClient().reminders.create(organizationId, {
    context: workContextForTarget(body),
    title: reminderTitleForTarget(body),
    remindAt: body.remindAt ?? null,
    offsetMinutesBeforeDue: body.offsetMinutesBeforeDue ?? null,
    channel: body.channel ?? 'in-app',
    userId: body.createdBy,
    createdBy: body.createdBy,
  })
  if (created.error)
    return { data: null, error: workErrorToProjects(created.error) }
  let rule: WorkRecurrenceRule | null = null
  if (body.recurrence) {
    const set = await workClient().reminders.recurrence.set(
      organizationId,
      created.data.id,
      toWorkRecurrenceDraft(body.recurrence)
    )
    if (set.error) return { data: null, error: workErrorToProjects(set.error) }
    rule = set.data
  }
  return {
    data: serializeReminder(created.data, resolved.tenant.id, rule),
    error: null,
  }
}

export async function updateReminder(
  organizationId: string,
  reminderId: string,
  userId: string,
  body: UpdateReminderBody
): Promise<ServiceResult<SerializedReminder>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await workClient().reminders.retrieve(
    organizationId,
    reminderId
  )
  if (existing.error?.code === 'work/reminder-not-found')
    return { data: null, error: getError('projects/reminder-not-found') }
  if (existing.error)
    return { data: null, error: workErrorToProjects(existing.error) }
  if (existing.data.context?.service !== 'projects')
    return { data: null, error: getError('projects/reminder-not-found') }
  const forbidden = checkReminderOwner(existing.data, userId)
  if (forbidden) return { data: null, error: forbidden }
  // Work holds a single context triple while the old columns were
  // independent. A target patch therefore replaces the target outright:
  // merging would leave a shadowed second id behind the issue-first
  // precedence below.
  const targetsTouched =
    body.issueId !== undefined ||
    body.milestoneId !== undefined ||
    body.eventId !== undefined
  let updated = existing.data
  const patch = {
    ...(targetsTouched
      ? {
          context:
            workContextForTarget({
              issueId: body.issueId ?? null,
              milestoneId: body.milestoneId ?? null,
              eventId: body.eventId ?? null,
            }) ?? null,
        }
      : {}),
    ...(body.remindAt !== undefined ? { remindAt: body.remindAt } : {}),
    ...(body.offsetMinutesBeforeDue !== undefined
      ? { offsetMinutesBeforeDue: body.offsetMinutesBeforeDue }
      : {}),
    ...(body.active !== undefined
      ? {
          status: body.active ? ('SCHEDULED' as const) : ('CANCELLED' as const),
        }
      : {}),
  }
  if (Object.keys(patch).length > 0) {
    const result = await workClient().reminders.update(
      organizationId,
      reminderId,
      patch
    )
    if (result.error?.code === 'work/reminder-not-found')
      return { data: null, error: getError('projects/reminder-not-found') }
    if (result.error)
      return { data: null, error: workErrorToProjects(result.error) }
    updated = result.data
  }
  let rule: WorkRecurrenceRule | null = null
  if (body.recurrence !== undefined) {
    if (body.recurrence === null) {
      const cleared = await workClient().reminders.recurrence.clear(
        organizationId,
        reminderId
      )
      if (cleared.error?.code === 'work/reminder-not-found')
        return { data: null, error: getError('projects/reminder-not-found') }
      if (cleared.error)
        return { data: null, error: workErrorToProjects(cleared.error) }
      updated = cleared.data
    } else {
      const currentRule = await retrieveWorkRule(organizationId, reminderId)
      if (currentRule.error) return { data: null, error: currentRule.error }
      const set = await workClient().reminders.recurrence.set(
        organizationId,
        reminderId,
        toWorkRecurrenceDraft(body.recurrence, currentRule.rule)
      )
      if (set.error?.code === 'work/reminder-not-found')
        return { data: null, error: getError('projects/reminder-not-found') }
      if (set.error)
        return { data: null, error: workErrorToProjects(set.error) }
      rule = set.data
    }
  } else {
    const currentRule = await retrieveWorkRule(organizationId, reminderId)
    if (currentRule.error) return { data: null, error: currentRule.error }
    rule = currentRule.rule
  }
  return {
    data: serializeReminder(updated, resolved.tenant.id, rule),
    error: null,
  }
}

export async function removeReminder(
  organizationId: string,
  reminderId: string,
  userId: string
): Promise<
  ServiceResult<{ object: 'projects.reminder'; id: string; deleted: true }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await workClient().reminders.retrieve(
    organizationId,
    reminderId
  )
  if (existing.error?.code === 'work/reminder-not-found')
    return { data: null, error: getError('projects/reminder-not-found') }
  if (existing.error)
    return { data: null, error: workErrorToProjects(existing.error) }
  if (existing.data.context?.service !== 'projects')
    return { data: null, error: getError('projects/reminder-not-found') }
  const forbidden = checkReminderOwner(existing.data, userId)
  if (forbidden) return { data: null, error: forbidden }
  const result = await workClient().reminders.delete(
    organizationId,
    reminderId,
    userId
  )
  if (result.error?.code === 'work/reminder-not-found')
    return { data: null, error: getError('projects/reminder-not-found') }
  if (result.error)
    return { data: null, error: workErrorToProjects(result.error) }
  return {
    data: { object: 'projects.reminder', id: reminderId, deleted: true },
    error: null,
  }
}

async function resolveWorkReminderTargetDueAt(
  organizationId: string,
  tenantId: string,
  reminder: WorkReminder
): Promise<{ dueAt: number | null; error: ProjectsError | null }> {
  const target = workReminderTarget(reminder)
  if (target.issueId) {
    const due = await repository.retrieveIssueDueDate(tenantId, target.issueId)
    return { dueAt: nullableFromDbUnixSeconds(due?.dueDate ?? null), error: null }
  }
  if (target.milestoneId) {
    const due = await repository.retrieveMilestoneTargetDate(
      tenantId,
      target.milestoneId
    )
    return {
      dueAt: nullableFromDbUnixSeconds(due?.targetDate ?? null),
      error: null,
    }
  }
  if (target.eventId) {
    const link = await repository.retrieveEventStart(tenantId, target.eventId)
    if (!link) return { dueAt: null, error: null }
    const result = await workClient().events.retrieve(organizationId, link.eventId)
    if (result.error)
      return { dueAt: null, error: workErrorToProjects(result.error) }
    if (!result.data.context) return { dueAt: null, error: null }
    const event = result.data
    if (event.allDay)
      return {
        dueAt: event.startDate ? unixSecondsFromDateOnly(event.startDate) : null,
        error: null,
      }
    return { dueAt: event.startAt, error: null }
  }
  return { dueAt: null, error: null }
}

async function effectiveWorkReminderBase(
  organizationId: string,
  tenantId: string,
  reminder: WorkReminder
): Promise<{ base: number | null; error: ProjectsError | null }> {
  if (reminder.remindAt !== null) return { base: reminder.remindAt, error: null }
  if (reminder.offsetMinutesBeforeDue === null) return { base: null, error: null }
  const target = await resolveWorkReminderTargetDueAt(
    organizationId,
    tenantId,
    reminder
  )
  if (target.error) return { base: null, error: target.error }
  if (target.dueAt === null) return { base: null, error: null }
  return { base: target.dueAt - reminder.offsetMinutesBeforeDue * 60, error: null }
}

export async function listDueReminders(
  organizationId: string,
  at: number | null,
  createdBy?: string
): Promise<ServiceResult<SerializedDueReminder[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const moment = at ?? nowUnixSeconds()
  const page = await listProjectReminders(organizationId, {
    status: 'SCHEDULED',
    ...(createdBy ? { userId: createdBy } : {}),
  })
  if (page.error) return { data: null, error: page.error }
  const scoped =
    createdBy === undefined
      ? page.reminders
      : page.reminders.filter((reminder) => reminder.createdBy === createdBy)
  const due: SerializedDueReminder[] = []
  for (const reminder of scoped) {
    const baseResult = await effectiveWorkReminderBase(
      organizationId,
      resolved.tenant.id,
      reminder
    )
    if (baseResult.error) return { data: null, error: baseResult.error }
    if (baseResult.base === null) continue
    const base = baseResult.base
    const rule = await retrieveWorkRule(organizationId, reminder.id)
    if (rule.error) return { data: null, error: rule.error }
    if (!rule.rule) {
      if (base <= moment)
        due.push(serializeDueReminder(reminder, resolved.tenant.id, null, base))
      continue
    }
    const occurrences = expandOccurrences(
      workRuleToRecurrenceRule(rule.rule, base),
      base,
      moment
    )
    if (occurrences.length === 0) continue
    due.push(
      serializeDueReminder(
        reminder,
        resolved.tenant.id,
        rule.rule,
        occurrences[occurrences.length - 1].start
      )
    )
  }
  due.sort((a, b) => a.dueAt - b.dueAt || (a.id < b.id ? -1 : 1))
  // Computing dues never writes: there is no scheduler in this phase, so no
  // reminder is marked sent, snoozed, or otherwise mutated here.
  return { data: due, error: null }
}

function eventOccurrenceId(eventId: string, start: number): string {
  return `${eventId}-${start}`
}

function eventEntriesForEvent(
  event: SerializedEvent,
  windowStart: number,
  windowEnd: number
): SerializedCalendarEntry[] {
  const kind = (
    event.kind === 'meeting' ? 'meeting' : 'event'
  ) as CalendarEntryKind
  const startsAt = event.startsAt
  const endsAt = event.endsAt
  const rule = eventRecurrenceRule(event)
  if (!rule) {
    const effectiveEnd = endsAt ?? startsAt
    if (startsAt > windowEnd || effectiveEnd < windowStart) return []
    return [
      {
        object: 'calendar-entry',
        kind,
        id: event.id,
        occurrenceStart: startsAt,
        occurrenceEnd: endsAt,
        allDay: event.allDay,
        title: event.title,
        projectId: event.projectId,
      },
    ]
  }
  return expandOccurrences(rule, windowStart, windowEnd).map((occurrence) => ({
    object: 'calendar-entry' as const,
    kind,
    id: eventOccurrenceId(event.id, occurrence.start),
    occurrenceStart: occurrence.start,
    occurrenceEnd: occurrence.end,
    allDay: event.allDay,
    title: event.title,
    projectId: event.projectId,
  }))
}

function issueEntriesForRow(
  row: CalendarIssueRow,
  windowStart: number,
  windowEnd: number
): SerializedCalendarEntry[] {
  if (row.status === 'done' || row.status === 'canceled') return []
  const entries: SerializedCalendarEntry[] = []
  const dueDate = nullableFromDbUnixSeconds(row.dueDate)
  if (dueDate !== null && dueDate >= windowStart && dueDate <= windowEnd) {
    entries.push({
      object: 'calendar-entry',
      kind: 'work-item',
      id: `${row.id}-due`,
      occurrenceStart: dueDate,
      occurrenceEnd: dueDate,
      allDay: true,
      title: row.title,
      projectId: row.projectId,
      issueIdentifier: row.identifier,
    })
  }
  const plannedStart = nullableFromDbUnixSeconds(row.plannedStartDate)
  const plannedFinish = nullableFromDbUnixSeconds(row.plannedFinishDate)
  if (plannedStart !== null || plannedFinish !== null) {
    const start = plannedStart ?? (plannedFinish as number)
    const end = plannedFinish ?? (plannedStart as number)
    if (start <= windowEnd && end >= windowStart) {
      entries.push({
        object: 'calendar-entry',
        kind: 'work-item',
        id: `${row.id}-planned`,
        occurrenceStart: start,
        occurrenceEnd: end,
        allDay: false,
        title: row.title,
        projectId: row.projectId,
        issueIdentifier: row.identifier,
      })
    }
  }
  return entries
}

export async function getCalendar(
  organizationId: string,
  query: CalendarQuery
): Promise<ServiceResult<SerializedCalendar>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const tenantId = resolved.tenant.id
  if (query.projectId) {
    const project = await projects.resolveProject(tenantId, query.projectId)
    if (!project)
      return { data: null, error: getError('projects/project-not-found') }
  }
  const wanted = (kind: CalendarEntryKind): boolean =>
    query.kinds === null || query.kinds.includes(kind)
  const entries: SerializedCalendarEntry[] = []
  const { from, to } = query

  if (wanted('project')) {
    const rows = await repository.listCalendarProjects(
      tenantId,
      query.projectId
    )
    for (const row of rows) {
      const start = nullableFromDbUnixSeconds(row.startDate)
      const end = nullableFromDbUnixSeconds(row.targetDate)
      if (start === null && end === null) continue
      const occurrenceStart = start ?? (end as number)
      const occurrenceEnd = end ?? (start as number)
      if (occurrenceStart > to || occurrenceEnd < from) continue
      entries.push({
        object: 'calendar-entry',
        kind: 'project',
        id: row.id,
        occurrenceStart,
        occurrenceEnd,
        allDay: true,
        title: row.name,
        projectId: row.id,
      })
    }
  }

  if (wanted('phase')) {
    const rows = await repository.listCalendarMilestones(
      tenantId,
      query.projectId
    )
    for (const row of rows) {
      const start = nullableFromDbUnixSeconds(row.startDate)
      const end = nullableFromDbUnixSeconds(row.targetDate)
      if (start === null && end === null) continue
      const occurrenceStart = start ?? (end as number)
      const occurrenceEnd = end ?? (start as number)
      if (occurrenceStart > to || occurrenceEnd < from) continue
      entries.push({
        object: 'calendar-entry',
        kind: 'phase',
        id: row.id,
        occurrenceStart,
        occurrenceEnd,
        allDay: true,
        title: row.name,
        projectId: row.projectId,
      })
    }
  }

  if (wanted('work-item')) {
    const rows = await repository.listCalendarIssues(tenantId, query.projectId)
    for (const row of rows) {
      entries.push(...issueEntriesForRow(row, from, to))
    }
  }

  if (wanted('event') || wanted('meeting')) {
    const events = await listEvents(organizationId, {
      ...(query.projectId ? { projectId: query.projectId } : {}),
    })
    if (events.error) return { data: null, error: events.error }
    for (const event of events.data) {
      if (event.kind === 'meeting' && !wanted('meeting')) continue
      if (event.kind !== 'meeting' && !wanted('event')) continue
      entries.push(...eventEntriesForEvent(event, from, to))
    }
  }

  entries.sort(
    (a, b) => a.occurrenceStart - b.occurrenceStart || (a.id < b.id ? -1 : 1)
  )
  return { data: { object: 'calendar', entries }, error: null }
}

function toMyWorkIssue(row: CalendarIssueRow): SerializedMyWorkIssue {
  return {
    object: 'projects.my-work-issue',
    id: row.id,
    projectId: row.projectId,
    identifier: row.identifier,
    title: row.title,
    status: row.status,
    dueDate: nullableFromDbUnixSeconds(row.dueDate),
    plannedStartDate: nullableFromDbUnixSeconds(row.plannedStartDate),
    plannedFinishDate: nullableFromDbUnixSeconds(row.plannedFinishDate),
  }
}

export async function getMyWork(
  organizationId: string,
  userId: string,
  now?: number
): Promise<ServiceResult<SerializedMyWork>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const tenantId = resolved.tenant.id
  const moment = now ?? nowUnixSeconds()

  const assigned = await repository.listAssignedIssues(tenantId, userId)
  const assignedIssues = assigned
    .filter((row) => row.status !== 'done' && row.status !== 'canceled')
    .map(toMyWorkIssue)

  const events = await listEvents(organizationId, {})
  if (events.error) return { data: null, error: events.error }
  const upcomingEvents = events.data.filter(
    (event) =>
      event.attendees.some((attendee) => attendee.userId === userId) &&
      (event.endsAt ?? event.startsAt) >= moment
  )
  upcomingEvents.sort((a, b) => a.startsAt - b.startsAt)

  const active = await listProjectReminders(organizationId, {
    status: 'SCHEDULED',
    userId,
  })
  if (active.error) return { data: null, error: active.error }
  const dueReminders: SerializedDueReminder[] = []
  for (const reminder of active.reminders) {
    if (reminder.createdBy !== userId) continue
    const baseResult = await effectiveWorkReminderBase(
      organizationId,
      tenantId,
      reminder
    )
    if (baseResult.error) return { data: null, error: baseResult.error }
    if (baseResult.base === null) continue
    const base = baseResult.base
    const rule = await retrieveWorkRule(organizationId, reminder.id)
    if (rule.error) return { data: null, error: rule.error }
    if (!rule.rule) {
      if (base <= moment)
        dueReminders.push(serializeDueReminder(reminder, tenantId, null, base))
      continue
    }
    const occurrences = expandOccurrences(
      workRuleToRecurrenceRule(rule.rule, base),
      base,
      moment
    )
    if (occurrences.length === 0) continue
    dueReminders.push(
      serializeDueReminder(
        reminder,
        tenantId,
        rule.rule,
        occurrences[occurrences.length - 1].start
      )
    )
  }
  dueReminders.sort((a, b) => a.dueAt - b.dueAt)

  return {
    data: {
      object: 'my-work',
      userId,
      assignedIssues,
      upcomingEvents,
      dueReminders,
    },
    error: null,
  }
}
