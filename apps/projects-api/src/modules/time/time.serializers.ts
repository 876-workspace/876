import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type TimeEntryRow = {
  id: string
  tenantId: string
  projectId: string
  issueId: string | null
  milestoneId: string | null
  taskListId: string | null
  userId: string
  startedAt: Timestamp
  endedAt: Timestamp | null
  durationMinutes: number | null
  billable: boolean
  note: string | null
  approvalStatus: string
  timesheetId: string | null
  createdBy: string | null
  deletedAt: Timestamp | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TimesheetRow = {
  id: string
  tenantId: string
  userId: string
  periodStart: Timestamp
  periodEnd: Timestamp
  status: string
  submittedAt: Timestamp | null
  decidedAt: Timestamp | null
  decidedBy: string | null
  note: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type TimesheetEventRow = {
  id: string
  tenantId: string
  timesheetId: string
  actorUserId: string
  fromStatus: string
  toStatus: string
  note: string | null
  createdAt: Timestamp
}

export type SerializedTimeEntry = {
  object: 'projects.time-entry'
  id: string
  tenantId: string
  projectId: string
  issueId: string | null
  milestoneId: string | null
  taskListId: string | null
  userId: string
  startedAt: number
  endedAt: number | null
  durationMinutes: number | null
  billable: boolean
  note: string | null
  approvalStatus: string
  timesheetId: string | null
  createdBy: string | null
  createdAt: number
  updatedAt: number
}

export type SerializedTimeEntryTombstone = {
  object: 'projects.time-entry'
  id: string
  deleted: true
}

export type TimeTotals = {
  totalMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
  entryCount: number
}

export type SerializedTimesheet = {
  object: 'projects.timesheet'
  id: string
  tenantId: string
  userId: string
  periodStart: number
  periodEnd: number
  status: string
  submittedAt: number | null
  decidedAt: number | null
  decidedBy: string | null
  note: string | null
  createdAt: number
  updatedAt: number
}

export type SerializedTimesheetDetail = SerializedTimesheet & {
  entries: SerializedTimeEntry[]
  totals: TimeTotals
}

export type SerializedTimesheetEvent = {
  object: 'projects.timesheet-event'
  id: string
  tenantId: string
  timesheetId: string
  actorUserId: string
  from: string
  to: string
  note: string | null
  createdAt: number
}

export type SerializedTimeSummaryGroup = {
  key: string | null
  totalMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
  entryCount: number
}

export type SerializedTimeSummary = {
  object: 'projects.time-summary'
  groupBy: string
  from: number
  to: number
  groups: SerializedTimeSummaryGroup[]
  totals: TimeTotals
}

export function serializeTimeEntry(row: TimeEntryRow): SerializedTimeEntry {
  return {
    object: 'projects.time-entry',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    issueId: row.issueId,
    milestoneId: row.milestoneId,
    taskListId: row.taskListId,
    userId: row.userId,
    startedAt: fromDbUnixSeconds(row.startedAt),
    endedAt: nullableFromDbUnixSeconds(row.endedAt),
    durationMinutes: row.durationMinutes,
    billable: row.billable,
    note: row.note,
    approvalStatus: row.approvalStatus,
    timesheetId: row.timesheetId,
    createdBy: row.createdBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function durationMinutesBetween(
  startedAt: number,
  endedAt: number
): number {
  return Math.max(0, Math.round((endedAt - startedAt) / 60))
}

export function isDeletedTimeEntry(row: TimeEntryRow): boolean {
  return row.deletedAt !== null && row.deletedAt !== undefined
}

export function emptyTotals(): TimeTotals {
  return {
    totalMinutes: 0,
    billableMinutes: 0,
    nonBillableMinutes: 0,
    entryCount: 0,
  }
}

export function computeTotals(
  entries: Array<{ durationMinutes: number | null; billable: boolean }>
): TimeTotals {
  const totals = emptyTotals()
  totals.entryCount = entries.length
  for (const entry of entries) {
    const minutes = entry.durationMinutes ?? 0
    totals.totalMinutes += minutes
    if (entry.billable) totals.billableMinutes += minutes
    else totals.nonBillableMinutes += minutes
  }
  return totals
}

export function serializeTimesheet(row: TimesheetRow): SerializedTimesheet {
  return {
    object: 'projects.timesheet',
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    periodStart: fromDbUnixSeconds(row.periodStart),
    periodEnd: fromDbUnixSeconds(row.periodEnd),
    status: row.status,
    submittedAt: nullableFromDbUnixSeconds(row.submittedAt),
    decidedAt: nullableFromDbUnixSeconds(row.decidedAt),
    decidedBy: row.decidedBy,
    note: row.note,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeTimesheetDetail(
  row: TimesheetRow,
  entries: SerializedTimeEntry[]
): SerializedTimesheetDetail {
  return {
    ...serializeTimesheet(row),
    entries,
    totals: computeTotals(entries),
  }
}

export function serializeTimesheetEvent(
  row: TimesheetEventRow
): SerializedTimesheetEvent {
  return {
    object: 'projects.timesheet-event',
    id: row.id,
    tenantId: row.tenantId,
    timesheetId: row.timesheetId,
    actorUserId: row.actorUserId,
    from: row.fromStatus,
    to: row.toStatus,
    note: row.note,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export function dayKeyForStartedAt(startedAt: number): string {
  return new Date(startedAt * 1000).toISOString().slice(0, 10)
}
