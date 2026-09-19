import { prisma } from '../../db/index.js'
import type { ProjectEventLinkRow } from './calendar.serializers.js'

export type CreateEventLinkParams = {
  eventId: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  issueId: string | null
  kind: string
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateEventLinkParams = {
  milestoneId?: string | null
  issueId?: string | null
  kind?: string
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

export async function createEventLink(
  params: CreateEventLinkParams
): Promise<ProjectEventLinkRow> {
  const row = await prisma['projectEventLink'].create({ data: params })
  return row as unknown as ProjectEventLinkRow
}

export async function listEventLinks(
  tenantId: string,
  projectId?: string
): Promise<ProjectEventLinkRow[]> {
  const rows = await prisma['projectEventLink'].findMany({
    where: { tenantId, ...(projectId ? { projectId } : {}) },
    orderBy: [{ eventId: 'asc' }],
  })
  return rows as unknown as ProjectEventLinkRow[]
}

export async function retrieveEventLink(
  tenantId: string,
  eventId: string
): Promise<ProjectEventLinkRow | null> {
  const row = await prisma['projectEventLink'].findFirst({
    where: { tenantId, eventId },
  })
  return row as unknown as ProjectEventLinkRow | null
}

export async function updateEventLink(
  tenantId: string,
  eventId: string,
  patch: UpdateEventLinkParams
): Promise<ProjectEventLinkRow> {
  const row = await prisma['projectEventLink'].update({
    where: { eventId },
    data: patch,
  })
  if (row.tenantId !== tenantId)
    throw new Error('Project event link tenant scope changed unexpectedly.')
  return row as unknown as ProjectEventLinkRow
}

export async function deleteEventLink(
  tenantId: string,
  eventId: string
): Promise<void> {
  await prisma['projectEventLink'].deleteMany({ where: { tenantId, eventId } })
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
): Promise<{ eventId: string } | null> {
  const row = await prisma['projectEventLink'].findFirst({
    where: { tenantId, eventId },
    select: { eventId: true },
  })
  return row
}
