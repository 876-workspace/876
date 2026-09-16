import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type ProjectEventRow = {
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  issueId: string | null
  kind: string
  title: string
  description: string | null
  startsAt: Timestamp
  endsAt: Timestamp | null
  allDay: boolean
  location: string | null
  meetingUrl: string | null
  createdBy: string | null
  recurrenceFreq: string | null
  recurrenceInterval: number | null
  recurrenceByWeekday: string | null
  recurrenceUntil: Timestamp | null
  recurrenceCount: number | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type EventAttendeeRow = {
  id: string
  tenantId: string
  eventId: string
  userId: string
  response: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ReminderRow = {
  id: string
  tenantId: string
  issueId: string | null
  milestoneId: string | null
  eventId: string | null
  remindAt: Timestamp | null
  offsetMinutesBeforeDue: number | null
  recurrenceFreq: string | null
  recurrenceInterval: number | null
  recurrenceByWeekday: string | null
  recurrenceUntil: Timestamp | null
  recurrenceCount: number | null
  channel: string
  createdBy: string
  active: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
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
  | 'project'
  | 'phase'
  | 'work-item'
  | 'event'
  | 'meeting'

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

export function formatStoredWeekdays(days: number[] | null | undefined): string | null {
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

export function serializeAttendee(row: EventAttendeeRow): SerializedAttendee {
  return {
    object: 'projects.event-attendee',
    id: row.id,
    eventId: row.eventId,
    userId: row.userId,
    response: row.response,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeEvent(
  row: ProjectEventRow,
  attendees: EventAttendeeRow[]
): SerializedEvent {
  return {
    object: 'projects.event',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    milestoneId: row.milestoneId,
    issueId: row.issueId,
    kind: row.kind,
    title: row.title,
    description: row.description,
    startsAt: fromDbUnixSeconds(row.startsAt),
    endsAt: nullableFromDbUnixSeconds(row.endsAt),
    allDay: row.allDay,
    location: row.location,
    meetingUrl: row.meetingUrl,
    createdBy: row.createdBy,
    recurrence: serializeRecurrence(row),
    attendees: attendees.map(serializeAttendee),
  }
}

export function serializeReminder(row: ReminderRow): SerializedReminder {
  return {
    object: 'projects.reminder',
    id: row.id,
    tenantId: row.tenantId,
    issueId: row.issueId,
    milestoneId: row.milestoneId,
    eventId: row.eventId,
    remindAt: nullableFromDbUnixSeconds(row.remindAt),
    offsetMinutesBeforeDue: row.offsetMinutesBeforeDue,
    recurrence: serializeRecurrence(row),
    channel: row.channel,
    createdBy: row.createdBy,
    active: row.active,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeDueReminder(
  row: ReminderRow,
  dueAt: number
): SerializedDueReminder {
  return { ...serializeReminder(row), dueAt }
}
