import type {
  WorkRecurrenceDraft,
  WorkRecurrenceRule,
  WorkReminder,
} from '@876/work'

import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  projectsEventWorkContext,
  projectsIssueWorkContext,
  projectsMilestoneWorkContext,
  workClient,
  workErrorToProjects,
} from '../../providers/work.js'
import {
  fromDbUnixSeconds,
  nowUnixSeconds,
  nullableFromDbUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './calendar.repository.js'
import type {
  CalendarIssueRow,
  UpdateEventParams,
} from './calendar.repository.js'
import { expandOccurrences, type RecurrenceRule } from './recurrence.js'
import {
  formatStoredWeekdays,
  parseStoredWeekdays,
  serializeAttendee,
  serializeDueReminder,
  serializeEvent,
  serializeReminder,
  workReminderTarget,
  workRuleToRecurrenceRule,
  type CalendarEntryKind,
  type ProjectEventRow,
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

function eventRecurrenceRule(row: ProjectEventRow): RecurrenceRule | null {
  if (row.recurrenceFreq === null) return null
  const startsAt = fromDbUnixSeconds(row.startsAt)
  const endsAt = nullableFromDbUnixSeconds(row.endsAt)
  return {
    freq: row.recurrenceFreq as RecurrenceRule['freq'],
    interval: row.recurrenceInterval ?? 1,
    byWeekday:
      row.recurrenceByWeekday === null
        ? null
        : parseStoredWeekdays(row.recurrenceByWeekday),
    until: nullableFromDbUnixSeconds(row.recurrenceUntil),
    count: row.recurrenceCount,
    startsAt,
    durationSeconds: endsAt === null ? null : Math.max(0, endsAt - startsAt),
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

type RecurrenceColumnsInput = {
  freq: RecurrenceRule['freq']
  interval?: number | null
  byWeekday?: number[] | null
  until?: number | null
  count?: number | null
}

function recurrenceColumns(input: RecurrenceColumnsInput | null | undefined): {
  recurrenceFreq: string | null
  recurrenceInterval: number | null
  recurrenceByWeekday: string | null
  recurrenceUntil: bigint | null
  recurrenceCount: number | null
} {
  if (!input) {
    return {
      recurrenceFreq: null,
      recurrenceInterval: null,
      recurrenceByWeekday: null,
      recurrenceUntil: null,
      recurrenceCount: null,
    }
  }
  return {
    recurrenceFreq: input.freq,
    recurrenceInterval: input.interval ?? 1,
    recurrenceByWeekday: formatStoredWeekdays(input.byWeekday),
    recurrenceUntil: nullableToDbUnixSeconds(input.until ?? null),
    recurrenceCount: input.count ?? null,
  }
}

async function loadEventWithAttendees(
  tenantId: string,
  row: ProjectEventRow
): Promise<SerializedEvent> {
  const attendees = await repository.listAttendeesForEvents(tenantId, [row.id])
  return serializeEvent(row, attendees)
}

export async function listEvents(
  organizationId: string,
  query: ListEventsQuery
): Promise<ServiceResult<SerializedEvent[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const rows = await repository.listEvents(resolved.tenant.id, query.projectId)
  const attendees = await repository.listAttendeesForEvents(
    resolved.tenant.id,
    rows.map((row) => row.id)
  )
  const byEvent = new Map<string, typeof attendees>()
  for (const attendee of attendees) {
    const bucket = byEvent.get(attendee.eventId) ?? []
    bucket.push(attendee)
    byEvent.set(attendee.eventId, bucket)
  }
  return {
    data: rows.map((row) => serializeEvent(row, byEvent.get(row.id) ?? [])),
    error: null,
  }
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
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createEvent({
    id: generateId('projectEvent'),
    tenantId: resolved.tenant.id,
    projectId: project.id,
    milestoneId: body.milestoneId ?? null,
    issueId: body.issueId ?? null,
    kind: body.kind ?? 'event',
    title: body.title,
    description: body.description ?? null,
    startsAt: toDbUnixSeconds(body.startsAt),
    endsAt: nullableToDbUnixSeconds(body.endsAt ?? null),
    allDay: body.allDay ?? false,
    location: body.location ?? null,
    meetingUrl: body.meetingUrl ?? null,
    createdBy: body.createdBy ?? null,
    ...recurrenceColumns(body.recurrence),
    createdAt: now,
    updatedAt: now,
  })
  return {
    data: await loadEventWithAttendees(resolved.tenant.id, row),
    error: null,
  }
}

export async function retrieveEvent(
  organizationId: string,
  eventId: string
): Promise<ServiceResult<SerializedEvent>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const row = await repository.retrieveEvent(resolved.tenant.id, eventId)
  if (!row) return { data: null, error: getError('projects/event-not-found') }
  return {
    data: await loadEventWithAttendees(resolved.tenant.id, row),
    error: null,
  }
}

export async function updateEvent(
  organizationId: string,
  eventId: string,
  body: UpdateEventBody
): Promise<ServiceResult<SerializedEvent>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveEvent(resolved.tenant.id, eventId)
  if (!existing)
    return { data: null, error: getError('projects/event-not-found') }
  const patch: UpdateEventParams = {
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  }
  if (body.milestoneId !== undefined) patch.milestoneId = body.milestoneId
  if (body.issueId !== undefined) patch.issueId = body.issueId
  if (body.kind !== undefined) patch.kind = body.kind
  if (body.title !== undefined) patch.title = body.title
  if (body.description !== undefined) patch.description = body.description
  if (body.startsAt !== undefined)
    patch.startsAt = toDbUnixSeconds(body.startsAt)
  if (body.endsAt !== undefined)
    patch.endsAt = nullableToDbUnixSeconds(body.endsAt)
  if (body.allDay !== undefined) patch.allDay = body.allDay
  if (body.location !== undefined) patch.location = body.location
  if (body.meetingUrl !== undefined) patch.meetingUrl = body.meetingUrl
  if (body.recurrence !== undefined) {
    if (body.recurrence === null) {
      patch.recurrenceFreq = null
      patch.recurrenceInterval = null
      patch.recurrenceByWeekday = null
      patch.recurrenceUntil = null
      patch.recurrenceCount = null
    } else {
      const columns = recurrenceColumns(body.recurrence)
      patch.recurrenceFreq = columns.recurrenceFreq
      if (body.recurrence.interval !== undefined)
        patch.recurrenceInterval = columns.recurrenceInterval
      if (body.recurrence.byWeekday !== undefined)
        patch.recurrenceByWeekday = columns.recurrenceByWeekday
      if (body.recurrence.until !== undefined)
        patch.recurrenceUntil = columns.recurrenceUntil
      if (body.recurrence.count !== undefined)
        patch.recurrenceCount = columns.recurrenceCount
    }
  }
  const row = await repository.updateEvent(resolved.tenant.id, eventId, patch)
  return {
    data: await loadEventWithAttendees(resolved.tenant.id, row),
    error: null,
  }
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
  const existing = await repository.retrieveEvent(resolved.tenant.id, eventId)
  if (!existing)
    return { data: null, error: getError('projects/event-not-found') }
  await repository.deleteEvent(resolved.tenant.id, eventId)
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
  const event = await repository.retrieveEvent(resolved.tenant.id, eventId)
  if (!event) return { data: null, error: getError('projects/event-not-found') }
  const existing = await repository.retrieveAttendee(
    resolved.tenant.id,
    eventId,
    body.userId
  )
  if (existing)
    return { data: null, error: getError('projects/attendee-exists') }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createAttendee({
    id: generateId('eventAttendee'),
    tenantId: resolved.tenant.id,
    eventId,
    userId: body.userId,
    response: body.response ?? 'invited',
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeAttendee(row), error: null }
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
  const event = await repository.retrieveEvent(resolved.tenant.id, eventId)
  if (!event) return { data: null, error: getError('projects/event-not-found') }
  const existing = await repository.retrieveAttendee(
    resolved.tenant.id,
    eventId,
    userId
  )
  if (!existing)
    return { data: null, error: getError('projects/attendee-not-found') }
  const row = await repository.updateAttendee(
    resolved.tenant.id,
    eventId,
    userId,
    { response: body.response, updatedAt: toDbUnixSeconds(nowUnixSeconds()) }
  )
  return { data: serializeAttendee(row), error: null }
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
  const event = await repository.retrieveEvent(resolved.tenant.id, eventId)
  if (!event) return { data: null, error: getError('projects/event-not-found') }
  const existing = await repository.retrieveAttendee(
    resolved.tenant.id,
    eventId,
    userId
  )
  if (!existing)
    return { data: null, error: getError('projects/attendee-not-found') }
  await repository.deleteAttendee(resolved.tenant.id, eventId, userId)
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
  tenantId: string,
  reminder: WorkReminder
): Promise<number | null> {
  const target = workReminderTarget(reminder)
  if (target.issueId) {
    const due = await repository.retrieveIssueDueDate(tenantId, target.issueId)
    return nullableFromDbUnixSeconds(due?.dueDate ?? null)
  }
  if (target.milestoneId) {
    const due = await repository.retrieveMilestoneTargetDate(
      tenantId,
      target.milestoneId
    )
    return nullableFromDbUnixSeconds(due?.targetDate ?? null)
  }
  if (target.eventId) {
    const start = await repository.retrieveEventStart(tenantId, target.eventId)
    return start ? fromDbUnixSeconds(start.startsAt) : null
  }
  return null
}

async function effectiveWorkReminderBase(
  tenantId: string,
  reminder: WorkReminder
): Promise<number | null> {
  if (reminder.remindAt !== null) return reminder.remindAt
  if (reminder.offsetMinutesBeforeDue === null) return null
  const targetDueAt = await resolveWorkReminderTargetDueAt(tenantId, reminder)
  if (targetDueAt === null) return null
  return targetDueAt - reminder.offsetMinutesBeforeDue * 60
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
    const base = await effectiveWorkReminderBase(resolved.tenant.id, reminder)
    if (base === null) continue
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

function eventEntriesForRow(
  row: ProjectEventRow,
  windowStart: number,
  windowEnd: number
): SerializedCalendarEntry[] {
  const kind = (
    row.kind === 'meeting' ? 'meeting' : 'event'
  ) as CalendarEntryKind
  const startsAt = fromDbUnixSeconds(row.startsAt)
  const endsAt = nullableFromDbUnixSeconds(row.endsAt)
  const rule = eventRecurrenceRule(row)
  if (!rule) {
    const effectiveEnd = endsAt ?? startsAt
    if (startsAt > windowEnd || effectiveEnd < windowStart) return []
    return [
      {
        object: 'calendar-entry',
        kind,
        id: row.id,
        occurrenceStart: startsAt,
        occurrenceEnd: endsAt,
        allDay: row.allDay,
        title: row.title,
        projectId: row.projectId,
      },
    ]
  }
  return expandOccurrences(rule, windowStart, windowEnd).map((occurrence) => ({
    object: 'calendar-entry' as const,
    kind,
    id: eventOccurrenceId(row.id, occurrence.start),
    occurrenceStart: occurrence.start,
    occurrenceEnd: occurrence.end,
    allDay: row.allDay,
    title: row.title,
    projectId: row.projectId,
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
    const rows = await repository.listEvents(tenantId, query.projectId)
    for (const row of rows) {
      if (row.kind === 'meeting' && !wanted('meeting')) continue
      if (row.kind !== 'meeting' && !wanted('event')) continue
      entries.push(...eventEntriesForRow(row, from, to))
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

  const attendances = await repository.listAttendeesByUser(tenantId, userId)
  const upcomingEvents: SerializedEvent[] = []
  for (const attendance of attendances) {
    const row = await repository.retrieveEvent(tenantId, attendance.eventId)
    if (!row) continue
    const startsAt = fromDbUnixSeconds(row.startsAt)
    const endsAt = nullableFromDbUnixSeconds(row.endsAt)
    if ((endsAt ?? startsAt) < moment) continue
    const attendees = await repository.listAttendeesForEvents(tenantId, [
      row.id,
    ])
    upcomingEvents.push(serializeEvent(row, attendees))
  }
  upcomingEvents.sort((a, b) => a.startsAt - b.startsAt)

  const active = await listProjectReminders(organizationId, {
    status: 'SCHEDULED',
    userId,
  })
  if (active.error) return { data: null, error: active.error }
  const dueReminders: SerializedDueReminder[] = []
  for (const reminder of active.reminders) {
    if (reminder.createdBy !== userId) continue
    const base = await effectiveWorkReminderBase(tenantId, reminder)
    if (base === null) continue
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
