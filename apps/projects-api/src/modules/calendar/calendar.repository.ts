import { prisma } from '../../db/index.js'
import type {
  EventAttendeeRow,
  ProjectEventRow,
  ReminderRow,
} from './calendar.serializers.js'

export type CreateEventParams = {
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  issueId: string | null
  kind: string
  title: string
  description: string | null
  startsAt: bigint
  endsAt: bigint | null
  allDay: boolean
  location: string | null
  meetingUrl: string | null
  createdBy: string | null
  recurrenceFreq: string | null
  recurrenceInterval: number | null
  recurrenceByWeekday: string | null
  recurrenceUntil: bigint | null
  recurrenceCount: number | null
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateEventParams = {
  milestoneId?: string | null
  issueId?: string | null
  kind?: string
  title?: string
  description?: string | null
  startsAt?: bigint
  endsAt?: bigint | null
  allDay?: boolean
  location?: string | null
  meetingUrl?: string | null
  recurrenceFreq?: string | null
  recurrenceInterval?: number | null
  recurrenceByWeekday?: string | null
  recurrenceUntil?: bigint | null
  recurrenceCount?: number | null
  updatedAt: bigint
}

export type CreateReminderParams = {
  id: string
  tenantId: string
  issueId: string | null
  milestoneId: string | null
  eventId: string | null
  remindAt: bigint | null
  offsetMinutesBeforeDue: number | null
  recurrenceFreq: string | null
  recurrenceInterval: number | null
  recurrenceByWeekday: string | null
  recurrenceUntil: bigint | null
  recurrenceCount: number | null
  channel: string
  createdBy: string
  active: boolean
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateReminderParams = {
  issueId?: string | null
  milestoneId?: string | null
  eventId?: string | null
  remindAt?: bigint | null
  offsetMinutesBeforeDue?: number | null
  recurrenceFreq?: string | null
  recurrenceInterval?: number | null
  recurrenceByWeekday?: string | null
  recurrenceUntil?: bigint | null
  recurrenceCount?: number | null
  active?: boolean
  updatedAt: bigint
}

export type CalendarProjectRow = {
  id: string
  name: string
  startDate: bigint | number | null
  targetDate: bigint | number | null
}

export type CalendarMilestoneRow = {
  id: string
  projectId: string
  name: string
  startDate: bigint | number | null
  targetDate: bigint | number | null
}

export type CalendarIssueRow = {
  id: string
  projectId: string
  identifier: string
  title: string
  status: string
  dueDate: bigint | number | null
  plannedStartDate: bigint | number | null
  plannedFinishDate: bigint | number | null
}

export async function createEvent(
  params: CreateEventParams
): Promise<ProjectEventRow> {
  const row = await prisma.projectEvent.create({ data: params })
  return row as unknown as ProjectEventRow
}

export async function listEvents(
  tenantId: string,
  projectId?: string
): Promise<ProjectEventRow[]> {
  const rows = await prisma.projectEvent.findMany({
    where: { tenantId, ...(projectId ? { projectId } : {}) },
    orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as ProjectEventRow[]
}

export async function retrieveEvent(
  tenantId: string,
  eventId: string
): Promise<ProjectEventRow | null> {
  const row = await prisma.projectEvent.findFirst({
    where: { tenantId, id: eventId },
  })
  return row as unknown as ProjectEventRow | null
}

export async function updateEvent(
  tenantId: string,
  eventId: string,
  patch: UpdateEventParams
): Promise<ProjectEventRow> {
  const row = await prisma.projectEvent.update({
    where: { id: eventId },
    data: { ...patch },
  })
  return row as unknown as ProjectEventRow
}

export async function deleteEvent(
  tenantId: string,
  eventId: string
): Promise<void> {
  await prisma.projectEvent.deleteMany({ where: { tenantId, id: eventId } })
}

export async function createAttendee(params: {
  id: string
  tenantId: string
  eventId: string
  userId: string
  response: string
  createdAt: bigint
  updatedAt: bigint
}): Promise<EventAttendeeRow> {
  const row = await prisma.eventAttendee.create({ data: params })
  return row as unknown as EventAttendeeRow
}

export async function retrieveAttendee(
  tenantId: string,
  eventId: string,
  userId: string
): Promise<EventAttendeeRow | null> {
  const row = await prisma.eventAttendee.findFirst({
    where: { tenantId, eventId, userId },
  })
  return row as unknown as EventAttendeeRow | null
}

export async function listAttendeesForEvents(
  tenantId: string,
  eventIds: string[]
): Promise<EventAttendeeRow[]> {
  if (eventIds.length === 0) return []
  const rows = await prisma.eventAttendee.findMany({
    where: { tenantId, eventId: { in: eventIds } },
    orderBy: [{ userId: 'asc' }],
  })
  return rows as unknown as EventAttendeeRow[]
}

export async function listAttendeesByUser(
  tenantId: string,
  userId: string
): Promise<EventAttendeeRow[]> {
  const rows = await prisma.eventAttendee.findMany({
    where: { tenantId, userId },
    orderBy: [{ eventId: 'asc' }],
  })
  return rows as unknown as EventAttendeeRow[]
}

export async function updateAttendee(
  tenantId: string,
  eventId: string,
  userId: string,
  patch: { response: string; updatedAt: bigint }
): Promise<EventAttendeeRow> {
  const row = await prisma.eventAttendee.updateMany({
    where: { tenantId, eventId, userId },
    data: patch,
  })
  void row
  const updated = await prisma.eventAttendee.findFirst({
    where: { tenantId, eventId, userId },
  })
  return updated as unknown as EventAttendeeRow
}

export async function deleteAttendee(
  tenantId: string,
  eventId: string,
  userId: string
): Promise<void> {
  await prisma.eventAttendee.deleteMany({
    where: { tenantId, eventId, userId },
  })
}

export async function createReminder(
  params: CreateReminderParams
): Promise<ReminderRow> {
  const row = await prisma.reminder.create({ data: params })
  return row as unknown as ReminderRow
}

export async function listRemindersByCreator(
  tenantId: string,
  createdBy: string
): Promise<ReminderRow[]> {
  const rows = await prisma.reminder.findMany({
    where: { tenantId, createdBy },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as ReminderRow[]
}

export async function listActiveReminders(
  tenantId: string
): Promise<ReminderRow[]> {
  const rows = await prisma.reminder.findMany({
    where: { tenantId, active: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as ReminderRow[]
}

export async function retrieveReminder(
  tenantId: string,
  reminderId: string
): Promise<ReminderRow | null> {
  const row = await prisma.reminder.findFirst({
    where: { tenantId, id: reminderId },
  })
  return row as unknown as ReminderRow | null
}

export async function updateReminder(
  tenantId: string,
  reminderId: string,
  patch: UpdateReminderParams
): Promise<ReminderRow> {
  const row = await prisma.reminder.update({
    where: { id: reminderId },
    data: { ...patch },
  })
  return row as unknown as ReminderRow
}

export async function deleteReminder(
  tenantId: string,
  reminderId: string
): Promise<void> {
  await prisma.reminder.deleteMany({ where: { tenantId, id: reminderId } })
}

export async function listCalendarProjects(
  tenantId: string,
  projectId?: string
): Promise<CalendarProjectRow[]> {
  const rows = await prisma.project.findMany({
    where: { tenantId, ...(projectId ? { id: projectId } : {}) },
    select: { id: true, name: true, startDate: true, targetDate: true },
    orderBy: { id: 'asc' },
  })
  return rows as unknown as CalendarProjectRow[]
}

export async function listCalendarMilestones(
  tenantId: string,
  projectId?: string
): Promise<CalendarMilestoneRow[]> {
  const rows = await prisma.milestone.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      startDate: true,
      targetDate: true,
    },
    orderBy: { id: 'asc' },
  })
  return rows as unknown as CalendarMilestoneRow[]
}

export async function listCalendarIssues(
  tenantId: string,
  projectId?: string
): Promise<CalendarIssueRow[]> {
  const rows = await prisma.issue.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(projectId ? { projectId } : {}),
    },
    select: {
      id: true,
      projectId: true,
      identifier: true,
      title: true,
      status: true,
      dueDate: true,
      plannedStartDate: true,
      plannedFinishDate: true,
    },
    orderBy: { id: 'asc' },
  })
  return rows as unknown as CalendarIssueRow[]
}

export async function listAssignedIssues(
  tenantId: string,
  userId: string
): Promise<CalendarIssueRow[]> {
  const rows = await prisma.issue.findMany({
    where: {
      tenantId,
      assigneeUserId: userId,
      deletedAt: null,
      status: { notIn: ['done', 'canceled'] },
    },
    select: {
      id: true,
      projectId: true,
      identifier: true,
      title: true,
      status: true,
      dueDate: true,
      plannedStartDate: true,
      plannedFinishDate: true,
    },
    orderBy: { id: 'asc' },
  })
  return rows as unknown as CalendarIssueRow[]
}

export async function retrieveIssueDueDate(
  tenantId: string,
  issueId: string
): Promise<{ dueDate: bigint | number | null } | null> {
  const row = await prisma.issue.findFirst({
    where: { tenantId, id: issueId, deletedAt: null },
    select: { dueDate: true },
  })
  return row as unknown as { dueDate: bigint | number | null } | null
}

export async function retrieveMilestoneTargetDate(
  tenantId: string,
  milestoneId: string
): Promise<{ targetDate: bigint | number | null } | null> {
  const row = await prisma.milestone.findFirst({
    where: { tenantId, id: milestoneId, deletedAt: null },
    select: { targetDate: true },
  })
  return row as unknown as { targetDate: bigint | number | null } | null
}

export async function retrieveEventStart(
  tenantId: string,
  eventId: string
): Promise<{ startsAt: bigint | number } | null> {
  const row = await prisma.projectEvent.findFirst({
    where: { tenantId, id: eventId },
    select: { startsAt: true },
  })
  return row as unknown as { startsAt: bigint | number } | null
}
