import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as automation from '../automation/index.js'
import * as projects from '../projects/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './time.repository.js'
import type {
  ApproveTimesheetBody,
  CreateTimeEntryBody,
  CreateTimesheetBody,
  ListTimeEntriesQuery,
  ListTimesheetsQuery,
  RecallTimesheetBody,
  RejectTimesheetBody,
  StartTimerBody,
  StopTimerBody,
  SubmitTimesheetBody,
  TimeSummaryQuery,
  UpdateTimeEntryBody,
} from './time.schemas.js'
import {
  computeTotals,
  dayKeyForStartedAt,
  durationMinutesBetween,
  isDeletedTimeEntry,
  serializeTimeEntry,
  serializeTimesheet,
  serializeTimesheetDetail,
  serializeTimesheetEvent,
  type SerializedTimeEntry,
  type SerializedTimeEntryTombstone,
  type SerializedTimeSummary,
  type SerializedTimesheet,
  type SerializedTimesheetDetail,
  type SerializedTimesheetEvent,
  type TimeEntryRow,
  type TimesheetRow,
} from './time.serializers.js'

export type ServiceResult<T> =
  { data: T; error: null } | { data: null; error: ProjectsError }

type TenantResolution =
  | { tenant: { id: string }; error: null }
  | { tenant: null; error: ProjectsError }

async function resolveTenant(organizationId: string): Promise<TenantResolution> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

function liveEntries(rows: TimeEntryRow[]): TimeEntryRow[] {
  return rows.filter((row) => !isDeletedTimeEntry(row))
}

async function loadTimesheetDetail(
  tenantId: string,
  sheet: TimesheetRow
): Promise<SerializedTimesheetDetail> {
  const rows = await repository.listTimesheetEntries(tenantId, sheet.id)
  const entries = liveEntries(rows).map(serializeTimeEntry)
  return serializeTimesheetDetail(sheet, entries)
}

async function entryLockError(
  tenantId: string,
  entry: TimeEntryRow
): Promise<ProjectsError | null> {
  if (!entry.timesheetId) return null
  const sheet = await repository.retrieveTimesheet(tenantId, entry.timesheetId)
  if (!sheet) return null
  if (sheet.status === 'submitted' || sheet.status === 'approved')
    return getError('projects/time-entry-locked')
  return null
}

export async function listTimeEntries(
  organizationId: string,
  query: ListTimeEntriesQuery
): Promise<ServiceResult<SerializedTimeEntry[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const rows = await repository.listTimeEntries(resolved.tenant.id, {
    userId: query.userId,
    projectId: query.projectId,
    issueId: query.issueId,
    from: query.from,
    to: query.to,
    billable: query.billable,
    approvalStatus: query.approvalStatus,
  })
  return { data: liveEntries(rows).map(serializeTimeEntry), error: null }
}

export type TimeEntryMutationContext = {
  automationRuleId?: string
  causationDepth?: number
}

export async function createTimeEntry(
  organizationId: string,
  body: CreateTimeEntryBody,
  context?: TimeEntryMutationContext
): Promise<ServiceResult<SerializedTimeEntry>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    body.projectId
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  if (body.endedAt < body.startedAt)
    return {
      data: null,
      error: getError('projects/invalid-request', {
        param: 'endedAt',
        description: 'endedAt must be at or after startedAt.',
      }),
    }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.transaction(async (tx) => {
    const created = await tx.createTimeEntry({
      id: generateId('timeEntry'),
      tenantId: resolved.tenant.id,
      projectId: project.id,
      issueId: body.issueId ?? null,
      milestoneId: body.milestoneId ?? null,
      taskListId: body.taskListId ?? null,
      userId: body.userId,
      startedAt: toDbUnixSeconds(body.startedAt),
      endedAt: toDbUnixSeconds(body.endedAt),
      durationMinutes:
        body.durationMinutes ??
        durationMinutesBetween(body.startedAt, body.endedAt),
      billable: body.billable ?? false,
      note: body.note ?? null,
      approvalStatus: 'draft',
      timesheetId: null,
      createdBy: body.createdBy ?? body.userId,
      createdAt: now,
      updatedAt: now,
    })
    await automation.appendOutboxEvent(tx.client, {
      tenantId: resolved.tenant.id,
      type: 'time-entry.submitted',
      subjectType: 'time-entry',
      subjectId: created.id,
      payload: {
        organizationId,
        projectId: project.id,
        issueId: body.issueId ?? null,
        userId: body.userId,
      },
      causationDepth: context?.causationDepth ?? 0,
    })
    return created
  })
  return { data: serializeTimeEntry(row), error: null }
}

export async function retrieveTimeEntry(
  organizationId: string,
  timeEntryId: string
): Promise<ServiceResult<SerializedTimeEntry>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const row = await repository.retrieveTimeEntry(resolved.tenant.id, timeEntryId)
  if (!row)
    return { data: null, error: getError('projects/time-entry-not-found') }
  return { data: serializeTimeEntry(row), error: null }
}

export async function updateTimeEntry(
  organizationId: string,
  timeEntryId: string,
  body: UpdateTimeEntryBody
): Promise<ServiceResult<SerializedTimeEntry>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveTimeEntry(
    resolved.tenant.id,
    timeEntryId
  )
  if (!existing)
    return { data: null, error: getError('projects/time-entry-not-found') }
  if (existing.userId !== body.userId)
    return { data: null, error: getError('projects/time-entry-forbidden') }
  const locked = await entryLockError(resolved.tenant.id, existing)
  if (locked) return { data: null, error: locked }

  let projectId = existing.projectId
  if (body.projectId !== undefined) {
    const project = await projects.resolveProject(
      resolved.tenant.id,
      body.projectId
    )
    if (!project)
      return { data: null, error: getError('projects/project-not-found') }
    projectId = project.id
  }

  const nextStarted = body.startedAt ?? fromDbUnixSeconds(existing.startedAt)
  const nextEnded =
    body.endedAt !== undefined
      ? body.endedAt
      : nullableFromDbUnixSeconds(existing.endedAt)
  if (nextEnded !== null && nextEnded < nextStarted)
    return {
      data: null,
      error: getError('projects/invalid-request', {
        param: 'endedAt',
        description: 'endedAt must be at or after startedAt.',
      }),
    }

  let durationMinutes = existing.durationMinutes
  if (body.durationMinutes !== undefined) {
    durationMinutes = body.durationMinutes
  } else if (body.startedAt !== undefined || body.endedAt !== undefined) {
    durationMinutes =
      nextEnded === null
        ? null
        : durationMinutesBetween(nextStarted, nextEnded)
  }

  const row = await repository.updateTimeEntry(
    resolved.tenant.id,
    timeEntryId,
    {
      projectId,
      ...(body.issueId !== undefined ? { issueId: body.issueId } : {}),
      ...(body.milestoneId !== undefined
        ? { milestoneId: body.milestoneId }
        : {}),
      ...(body.taskListId !== undefined
        ? { taskListId: body.taskListId }
        : {}),
      ...(body.startedAt !== undefined
        ? { startedAt: toDbUnixSeconds(body.startedAt) }
        : {}),
      ...(body.endedAt !== undefined
        ? { endedAt: body.endedAt === null ? null : toDbUnixSeconds(body.endedAt) }
        : {}),
      durationMinutes,
      ...(body.billable !== undefined ? { billable: body.billable } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
      updatedAt: toDbUnixSeconds(nowUnixSeconds()),
    }
  )
  return { data: serializeTimeEntry(row), error: null }
}

export async function removeTimeEntry(
  organizationId: string,
  timeEntryId: string,
  userId: string
): Promise<ServiceResult<SerializedTimeEntryTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.retrieveTimeEntry(
    resolved.tenant.id,
    timeEntryId
  )
  if (!existing)
    return { data: null, error: getError('projects/time-entry-not-found') }
  if (existing.userId !== userId)
    return { data: null, error: getError('projects/time-entry-forbidden') }
  const locked = await entryLockError(resolved.tenant.id, existing)
  if (locked) return { data: null, error: locked }
  const now = toDbUnixSeconds(nowUnixSeconds())
  await repository.softDeleteTimeEntry(resolved.tenant.id, timeEntryId, {
    deletedBy: userId,
    deletionReason: null,
    deletedAt: now,
    updatedAt: now,
  })
  return {
    data: { object: 'projects.time-entry', id: timeEntryId, deleted: true },
    error: null,
  }
}

export async function startTimer(
  organizationId: string,
  body: StartTimerBody
): Promise<
  ServiceResult<{ stopped: SerializedTimeEntry | null; started: SerializedTimeEntry }>
> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const project = await projects.resolveProject(
    resolved.tenant.id,
    body.projectId
  )
  if (!project)
    return { data: null, error: getError('projects/project-not-found') }
  const moment = body.startedAt ?? nowUnixSeconds()
  const now = toDbUnixSeconds(moment)
  const result = await repository.startTimerAtomic({
    id: generateId('timeEntry'),
    tenantId: resolved.tenant.id,
    userId: body.userId,
    projectId: project.id,
    issueId: body.issueId ?? null,
    milestoneId: body.milestoneId ?? null,
    taskListId: body.taskListId ?? null,
    billable: body.billable ?? false,
    note: body.note ?? null,
    createdBy: body.userId,
    startedAt: now,
    now,
  })
  return {
    data: {
      stopped: result.stopped ? serializeTimeEntry(result.stopped) : null,
      started: serializeTimeEntry(result.started),
    },
    error: null,
  }
}

export async function stopTimer(
  organizationId: string,
  body: StopTimerBody
): Promise<ServiceResult<SerializedTimeEntry>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const running = await repository.retrieveRunningEntry(
    resolved.tenant.id,
    body.userId
  )
  if (!running)
    return { data: null, error: getError('projects/timer-not-found') }
  const startedAt = fromDbUnixSeconds(running.startedAt)
  const endedAt = body.endedAt ?? nowUnixSeconds()
  if (endedAt < startedAt)
    return {
      data: null,
      error: getError('projects/invalid-request', {
        param: 'endedAt',
        description: 'endedAt must be at or after startedAt.',
      }),
    }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.updateTimeEntry(
    resolved.tenant.id,
    running.id,
    {
      endedAt: toDbUnixSeconds(endedAt),
      durationMinutes: durationMinutesBetween(startedAt, endedAt),
      updatedAt: now,
    }
  )
  return { data: serializeTimeEntry(row), error: null }
}

export async function currentTimer(
  organizationId: string,
  userId: string
): Promise<ServiceResult<SerializedTimeEntry | null>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const running = await repository.retrieveRunningEntry(
    resolved.tenant.id,
    userId
  )
  return { data: running ? serializeTimeEntry(running) : null, error: null }
}

async function collectAttachableEntries(
  tenantId: string,
  userId: string,
  periodStart: number,
  periodEnd: number,
  entryIds: string[] | undefined
): Promise<
  | { entries: TimeEntryRow[]; error: null }
  | { entries: null; error: ProjectsError }
> {
  if (entryIds !== undefined) {
    const entries: TimeEntryRow[] = []
    for (const entryId of entryIds) {
      const entry = await repository.retrieveTimeEntry(tenantId, entryId)
      if (!entry)
        return {
          entries: null,
          error: getError('projects/time-entry-not-found'),
        }
      if (entry.userId !== userId)
        return {
          entries: null,
          error: getError('projects/time-entry-forbidden'),
        }
      if (entry.timesheetId !== null)
        return {
          entries: null,
          error: getError('projects/invalid-request', {
            param: 'entryIds',
            description: 'One of the entries is already attached to a timesheet.',
          }),
        }
      entries.push(entry)
    }
    return { entries, error: null }
  }
  const rows = await repository.listTimeEntries(tenantId, {
    userId,
    from: periodStart,
    to: periodEnd,
  })
  return {
    entries: liveEntries(rows).filter((entry) => entry.timesheetId === null),
    error: null,
  }
}

export async function listTimesheets(
  organizationId: string,
  query: ListTimesheetsQuery
): Promise<ServiceResult<SerializedTimesheet[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const rows = await repository.listTimesheets(resolved.tenant.id, {
    userId: query.userId,
    status: query.status,
  })
  return { data: rows.map(serializeTimesheet), error: null }
}

export async function createTimesheet(
  organizationId: string,
  body: CreateTimesheetBody
): Promise<ServiceResult<SerializedTimesheetDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const collected = await collectAttachableEntries(
    resolved.tenant.id,
    body.userId,
    body.periodStart,
    body.periodEnd,
    body.entryIds
  )
  if (collected.error || !collected.entries)
    return { data: null, error: collected.error }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const sheet = await repository.createTimesheet({
    id: generateId('timesheet'),
    tenantId: resolved.tenant.id,
    userId: body.userId,
    periodStart: toDbUnixSeconds(body.periodStart),
    periodEnd: toDbUnixSeconds(body.periodEnd),
    status: 'draft',
    note: body.note ?? null,
    createdAt: now,
    updatedAt: now,
  })
  await repository.attachEntriesToTimesheet(
    resolved.tenant.id,
    collected.entries.map((entry) => entry.id),
    sheet.id,
    now
  )
  return { data: await loadTimesheetDetail(resolved.tenant.id, sheet), error: null }
}

export async function retrieveTimesheet(
  organizationId: string,
  timesheetId: string
): Promise<ServiceResult<SerializedTimesheetDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const sheet = await repository.retrieveTimesheet(
    resolved.tenant.id,
    timesheetId
  )
  if (!sheet)
    return { data: null, error: getError('projects/timesheet-not-found') }
  return { data: await loadTimesheetDetail(resolved.tenant.id, sheet), error: null }
}

async function applyTimesheetTransition(
  tenantId: string,
  sheet: TimesheetRow,
  to: string,
  actorUserId: string,
  note: string | null,
  patch: Omit<Parameters<typeof repository.updateTimesheet>[2], 'updatedAt'>
): Promise<SerializedTimesheetDetail> {
  const now = toDbUnixSeconds(nowUnixSeconds())
  const updated = await repository.updateTimesheet(tenantId, sheet.id, {
    ...patch,
    status: to,
    updatedAt: now,
  })
  await repository.setEntriesApprovalForTimesheet(tenantId, sheet.id, to, now)
  await repository.createTimesheetEvent({
    id: generateId('timesheetEvent'),
    tenantId,
    timesheetId: sheet.id,
    actorUserId,
    fromStatus: sheet.status,
    toStatus: to,
    note,
    createdAt: now,
  })
  return loadTimesheetDetail(tenantId, updated)
}

export async function submitTimesheet(
  organizationId: string,
  timesheetId: string,
  body: SubmitTimesheetBody
): Promise<ServiceResult<SerializedTimesheetDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const sheet = await repository.retrieveTimesheet(
    resolved.tenant.id,
    timesheetId
  )
  if (!sheet)
    return { data: null, error: getError('projects/timesheet-not-found') }
  if (sheet.userId !== body.userId)
    return { data: null, error: getError('projects/timesheet-forbidden') }
  if (sheet.status !== 'draft' && sheet.status !== 'rejected')
    return {
      data: null,
      error: getError('projects/timesheet-transition-invalid'),
    }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const updated = await repository.updateTimesheet(
    resolved.tenant.id,
    sheet.id,
    {
      status: 'submitted',
      submittedAt: now,
      decidedAt: null,
      decidedBy: null,
      updatedAt: now,
    }
  )
  await repository.setEntriesApprovalForTimesheet(
    resolved.tenant.id,
    sheet.id,
    'submitted',
    now
  )
  await repository.createTimesheetEvent({
    id: generateId('timesheetEvent'),
    tenantId: resolved.tenant.id,
    timesheetId: sheet.id,
    actorUserId: body.userId,
    fromStatus: sheet.status,
    toStatus: 'submitted',
    note: null,
    createdAt: now,
  })
  return {
    data: await loadTimesheetDetail(resolved.tenant.id, updated),
    error: null,
  }
}

export async function approveTimesheet(
  organizationId: string,
  timesheetId: string,
  body: ApproveTimesheetBody
): Promise<ServiceResult<SerializedTimesheetDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const sheet = await repository.retrieveTimesheet(
    resolved.tenant.id,
    timesheetId
  )
  if (!sheet)
    return { data: null, error: getError('projects/timesheet-not-found') }
  if (sheet.status !== 'submitted')
    return {
      data: null,
      error: getError('projects/timesheet-transition-invalid'),
    }
  if (sheet.userId === body.decidedBy)
    return {
      data: null,
      error: getError('projects/timesheet-self-approval'),
    }
  const now = toDbUnixSeconds(nowUnixSeconds())
  return {
    data: await applyTimesheetTransition(
      resolved.tenant.id,
      sheet,
      'approved',
      body.decidedBy,
      body.note ?? null,
      { decidedAt: now, decidedBy: body.decidedBy }
    ),
    error: null,
  }
}

export async function rejectTimesheet(
  organizationId: string,
  timesheetId: string,
  body: RejectTimesheetBody
): Promise<ServiceResult<SerializedTimesheetDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const sheet = await repository.retrieveTimesheet(
    resolved.tenant.id,
    timesheetId
  )
  if (!sheet)
    return { data: null, error: getError('projects/timesheet-not-found') }
  if (sheet.status !== 'submitted')
    return {
      data: null,
      error: getError('projects/timesheet-transition-invalid'),
    }
  if (sheet.userId === body.decidedBy)
    return {
      data: null,
      error: getError('projects/timesheet-self-approval'),
    }
  if (!body.note || body.note.trim().length === 0)
    return { data: null, error: getError('projects/timesheet-note-required') }
  const now = toDbUnixSeconds(nowUnixSeconds())
  return {
    data: await applyTimesheetTransition(
      resolved.tenant.id,
      sheet,
      'rejected',
      body.decidedBy,
      body.note,
      { decidedAt: now, decidedBy: body.decidedBy, note: body.note }
    ),
    error: null,
  }
}

export async function recallTimesheet(
  organizationId: string,
  timesheetId: string,
  body: RecallTimesheetBody
): Promise<ServiceResult<SerializedTimesheetDetail>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const sheet = await repository.retrieveTimesheet(
    resolved.tenant.id,
    timesheetId
  )
  if (!sheet)
    return { data: null, error: getError('projects/timesheet-not-found') }
  if (sheet.userId !== body.userId)
    return { data: null, error: getError('projects/timesheet-forbidden') }
  if (sheet.status !== 'submitted')
    return {
      data: null,
      error: getError('projects/timesheet-transition-invalid'),
    }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const updated = await repository.updateTimesheet(
    resolved.tenant.id,
    sheet.id,
    {
      status: 'draft',
      submittedAt: null,
      updatedAt: now,
    }
  )
  await repository.setEntriesApprovalForTimesheet(
    resolved.tenant.id,
    sheet.id,
    'draft',
    now
  )
  await repository.createTimesheetEvent({
    id: generateId('timesheetEvent'),
    tenantId: resolved.tenant.id,
    timesheetId: sheet.id,
    actorUserId: body.userId,
    fromStatus: 'submitted',
    toStatus: 'draft',
    note: null,
    createdAt: now,
  })
  return {
    data: await loadTimesheetDetail(resolved.tenant.id, updated),
    error: null,
  }
}

export async function listTimesheetEvents(
  organizationId: string,
  timesheetId: string
): Promise<ServiceResult<SerializedTimesheetEvent[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const sheet = await repository.retrieveTimesheet(
    resolved.tenant.id,
    timesheetId
  )
  if (!sheet)
    return { data: null, error: getError('projects/timesheet-not-found') }
  const rows = await repository.listTimesheetEvents(
    resolved.tenant.id,
    timesheetId
  )
  return { data: rows.map(serializeTimesheetEvent), error: null }
}

export async function getTimeSummary(
  organizationId: string,
  query: TimeSummaryQuery
): Promise<ServiceResult<SerializedTimeSummary>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const rows = await repository.listEntriesForSummary(resolved.tenant.id, {
    from: query.from,
    to: query.to,
    userId: query.userId,
    projectId: query.projectId,
    issueId: query.issueId,
  })
  const entries = liveEntries(rows).map(serializeTimeEntry)
  const groups = new Map<string | null, SerializedTimeEntry[]>()
  for (const entry of entries) {
    let key: string | null
    switch (query.groupBy) {
      case 'project':
        key = entry.projectId
        break
      case 'user':
        key = entry.userId
        break
      case 'issue':
        key = entry.issueId
        break
      case 'day':
        key = dayKeyForStartedAt(entry.startedAt)
        break
    }
    const bucket = groups.get(key) ?? []
    bucket.push(entry)
    groups.set(key, bucket)
  }
  return {
    data: {
      object: 'projects.time-summary',
      groupBy: query.groupBy,
      from: query.from,
      to: query.to,
      groups: [...groups].map(([key, bucket]) => ({
        key,
        ...computeTotals(bucket),
      })),
      totals: computeTotals(entries),
    },
    error: null,
  }
}
