import type {
  WorkEventParticipant,
  WorkEventResource,
  WorkRecurrenceRule,
  WorkReminder,
} from '@876/work'

import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
import type { RecurrenceRule } from './recurrence.js'

type Timestamp = bigint | number

export type ProjectEventLinkRow = {
  eventId: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  issueId: string | null
  kind: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type WorkReminderTarget = {
  issueId: string | null
  milestoneId: string | null
  eventId: string | null
}

const WORK_FREQUENCY_TO_PROJECTS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const

const WORK_DAY_TO_NUMBER = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 0,
} as const

export function workReminderTarget(reminder: WorkReminder): WorkReminderTarget {
  const context = reminder.context
  const isProjects = context?.service === 'projects'
  return {
    issueId: isProjects && context?.resource === 'issue' ? context.id : null,
    milestoneId:
      isProjects && context?.resource === 'milestone' ? context.id : null,
    eventId: isProjects && context?.resource === 'event' ? context.id : null,
  }
}

export function serializeWorkRecurrence(
  rule: WorkRecurrenceRule | null
): SerializedRecurrence | null {
  if (!rule) return null
  return {
    freq: WORK_FREQUENCY_TO_PROJECTS[rule.frequency],
    interval: rule.interval,
    byWeekday: rule.byDay.map((day) => WORK_DAY_TO_NUMBER[day]),
    until: rule.untilAt,
    count: rule.count,
  }
}

export function workRuleToRecurrenceRule(
  rule: WorkRecurrenceRule,
  base: number
): RecurrenceRule {
  return {
    freq: WORK_FREQUENCY_TO_PROJECTS[rule.frequency],
    interval: rule.interval,
    byWeekday: rule.byDay.map((day) => WORK_DAY_TO_NUMBER[day]),
    until: rule.untilAt,
    count: rule.count,
    startsAt: base,
    durationSeconds: null,
  }
}

export type SerializedRecurrence = {
  freq: string
  interval: number
  byWeekday: number[]
  until: number | null
  count: number | null
}

export type SerializedAttendee = {
  object: 'projects.event-attendee'
  id: string
  eventId: string
  userId: string
  response: string
  createdAt: number
  updatedAt: number
}

const WORK_PARTICIPANT_STATUS_TO_PROJECTS = {
  NEEDS_ACTION: 'invited',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  TENTATIVE: 'tentative',
  DELEGATED: 'invited',
} as const

function dateOnlyToUnixSeconds(value: string): number {
  return Math.floor(new Date(`${value}T00:00:00.000Z`).getTime() / 1000)
}

function eventTimes(event: WorkEventResource): {
  startsAt: number
  endsAt: number | null
} {
  if (event.allDay) {
    if (!event.startDate || !event.endDate)
      throw new Error('Work returned an all-day event without dates.')
    return {
      startsAt: dateOnlyToUnixSeconds(event.startDate),
      endsAt: dateOnlyToUnixSeconds(event.endDate),
    }
  }
  if (event.startAt === null || event.endAt === null)
    throw new Error('Work returned a timed event without times.')
  return { startsAt: event.startAt, endsAt: event.endAt }
}

export type SerializedEvent = {
  object: 'projects.event'
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  issueId: string | null
  kind: string
  title: string
  description: string | null
  startsAt: number
  endsAt: number | null
  allDay: boolean
  location: string | null
  meetingUrl: string | null
  createdBy: string | null
  recurrence: SerializedRecurrence | null
  attendees: SerializedAttendee[]
}

export type SerializedReminder = {
  object: 'projects.reminder'
  id: string
  tenantId: string
  issueId: string | null
  milestoneId: string | null
  eventId: string | null
  remindAt: number | null
  offsetMinutesBeforeDue: number | null
  recurrence: SerializedRecurrence | null
  channel: string
  createdBy: string
  active: boolean
  createdAt: number
  updatedAt: number
}

export type SerializedDueReminder = SerializedReminder & {
  dueAt: number
}

export type CalendarEntryKind =
  'project' | 'phase' | 'work-item' | 'event' | 'meeting'

export type SerializedCalendarEntry = {
  object: 'calendar-entry'
  kind: CalendarEntryKind
  id: string
  occurrenceStart: number
  occurrenceEnd: number | null
  allDay: boolean
  title: string
  projectId: string
  issueIdentifier?: string
}

export type SerializedCalendar = {
  object: 'calendar'
  entries: SerializedCalendarEntry[]
}

export type SerializedMyWorkIssue = {
  object: 'projects.my-work-issue'
  id: string
  projectId: string
  identifier: string
  title: string
  status: string
  dueDate: number | null
  plannedStartDate: number | null
  plannedFinishDate: number | null
}

export type SerializedMyWork = {
  object: 'my-work'
  userId: string
  assignedIssues: SerializedMyWorkIssue[]
  upcomingEvents: SerializedEvent[]
  dueReminders: SerializedDueReminder[]
}

export type SerializedEventTombstone = {
  object: 'projects.event'
  id: string
  deleted: true
}

export type SerializedReminderTombstone = {
  object: 'projects.reminder'
  id: string
  deleted: true
}

export type SerializedAttendeeTombstone = {
  object: 'projects.event-attendee'
  id: string
  deleted: true
}

export function parseStoredWeekdays(value: string | null): number[] {
  if (value === null || value.trim() === '') return []
  return value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
}

export function formatStoredWeekdays(
  days: number[] | null | undefined
): string | null {
  if (!days || days.length === 0) return null
  return [...new Set(days)].sort((a, b) => a - b).join(',')
}

export function serializeRecurrence(row: {
  recurrenceFreq: string | null
  recurrenceInterval: number | null
  recurrenceByWeekday: string | null
  recurrenceUntil: Timestamp | null
  recurrenceCount: number | null
}): SerializedRecurrence | null {
  if (row.recurrenceFreq === null) return null
  return {
    freq: row.recurrenceFreq,
    interval: row.recurrenceInterval ?? 1,
    byWeekday: parseStoredWeekdays(row.recurrenceByWeekday),
    until: nullableFromDbUnixSeconds(row.recurrenceUntil),
    count: row.recurrenceCount,
  }
}

export function serializeWorkAttendee(
  participant: WorkEventParticipant
): SerializedAttendee | null {
  if (participant.kind !== 'USER' || !participant.participantId) return null
  return {
    object: 'projects.event-attendee',
    id: participant.id,
    eventId: participant.eventId,
    userId: participant.participantId,
    response: WORK_PARTICIPANT_STATUS_TO_PROJECTS[participant.status],
    createdAt: participant.createdAt,
    updatedAt: participant.updatedAt,
  }
}

export function serializeWorkEvent(
  event: WorkEventResource,
  link: ProjectEventLinkRow,
  rule: WorkRecurrenceRule | null
): SerializedEvent {
  const { startsAt, endsAt } = eventTimes(event)
  return {
    object: 'projects.event',
    id: event.id,
    tenantId: link.tenantId,
    projectId: link.projectId,
    milestoneId: link.milestoneId,
    issueId: link.issueId,
    kind: link.kind,
    title: event.title,
    description: event.description,
    startsAt,
    endsAt,
    allDay: event.allDay,
    location: event.location,
    meetingUrl: event.meetingUrl,
    createdBy: event.createdBy === 'system' ? null : event.createdBy,
    recurrence: serializeWorkRecurrence(rule),
    attendees: event.participants
      .map(serializeWorkAttendee)
      .filter((attendee): attendee is SerializedAttendee => attendee !== null),
  }
}

export function serializeReminder(
  reminder: WorkReminder,
  tenantId: string,
  rule: WorkRecurrenceRule | null
): SerializedReminder {
  const target = workReminderTarget(reminder)
  return {
    object: 'projects.reminder',
    id: reminder.id,
    tenantId,
    issueId: target.issueId,
    milestoneId: target.milestoneId,
    eventId: target.eventId,
    remindAt: reminder.remindAt,
    offsetMinutesBeforeDue: reminder.offsetMinutesBeforeDue,
    recurrence: serializeWorkRecurrence(rule),
    channel: reminder.channel,
    createdBy: reminder.createdBy,
    active: reminder.status !== 'CANCELLED',
    createdAt: reminder.createdAt,
    updatedAt: reminder.updatedAt,
  }
}

export function serializeDueReminder(
  reminder: WorkReminder,
  tenantId: string,
  rule: WorkRecurrenceRule | null,
  dueAt: number
): SerializedDueReminder {
  return { ...serializeReminder(reminder, tenantId, rule), dueAt }
}
