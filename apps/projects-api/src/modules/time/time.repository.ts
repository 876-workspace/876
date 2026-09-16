import { prisma } from '../../db/index.js'
import { durationMinutesBetween } from './time.serializers.js'
import type {
  TimeEntryRow,
  TimesheetEventRow,
  TimesheetRow,
} from './time.serializers.js'

export type CreateTimeEntryParams = {
  id: string
  tenantId: string
  projectId: string
  issueId: string | null
  milestoneId: string | null
  taskListId: string | null
  userId: string
  startedAt: bigint
  endedAt: bigint
  durationMinutes: number
  billable: boolean
  note: string | null
  approvalStatus: string
  timesheetId: string | null
  createdBy: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateTimeEntryParams = {
  projectId?: string
  issueId?: string | null
  milestoneId?: string | null
  taskListId?: string | null
  startedAt?: bigint
  endedAt?: bigint | null
  durationMinutes?: number | null
  billable?: boolean
  note?: string | null
  approvalStatus?: string
  timesheetId?: string | null
  updatedAt: bigint
}

export type ListTimeEntriesFilter = {
  userId?: string
  projectId?: string
  issueId?: string
  from?: number
  to?: number
  billable?: boolean
  approvalStatus?: string
}

export type SummaryFilter = {
  from: number
  to: number
  userId?: string
  projectId?: string
  issueId?: string
}

export type StartTimerParams = {
  id: string
  tenantId: string
  userId: string
  projectId: string
  issueId: string | null
  milestoneId: string | null
  taskListId: string | null
  billable: boolean
  note: string | null
  createdBy: string | null
  startedAt: bigint
  now: bigint
}

export type CreateTimesheetParams = {
  id: string
  tenantId: string
  userId: string
  periodStart: bigint
  periodEnd: bigint
  status: string
  note: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateTimesheetParams = {
  status?: string
  submittedAt?: bigint | null
  decidedAt?: bigint | null
  decidedBy?: string | null
  note?: string | null
  updatedAt: bigint
}

export type CreateTimesheetEventParams = {
  id: string
  tenantId: string
  timesheetId: string
  actorUserId: string
  fromStatus: string
  toStatus: string
  note: string | null
  createdAt: bigint
}

export type TimeTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

export type TimeTransaction = {
  client: TimeTransactionClient
  createTimeEntry: (params: CreateTimeEntryParams) => Promise<TimeEntryRow>
}

export async function transaction<T>(
  callback: (tx: TimeTransaction) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (txPrisma) => {
    const client = txPrisma as TimeTransactionClient
    return callback({
      client,
      createTimeEntry: async (params: CreateTimeEntryParams) => {
        const row = await txPrisma.timeEntry.create({ data: params })
        return row as unknown as TimeEntryRow
      },
    })
  })
}

const liveEntryWhere = { deletedAt: null } as const

export async function createTimeEntry(
  params: CreateTimeEntryParams
): Promise<TimeEntryRow> {
  const row = await prisma.timeEntry.create({ data: params })
  return row as unknown as TimeEntryRow
}

export async function listTimeEntries(
  tenantId: string,
  filter: ListTimeEntriesFilter
): Promise<TimeEntryRow[]> {
  const rows = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      ...liveEntryWhere,
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.issueId ? { issueId: filter.issueId } : {}),
      ...(filter.billable !== undefined ? { billable: filter.billable } : {}),
      ...(filter.approvalStatus ? { approvalStatus: filter.approvalStatus } : {}),
      ...(filter.from !== undefined || filter.to !== undefined
        ? {
            startedAt: {
              ...(filter.from !== undefined ? { gte: BigInt(filter.from) } : {}),
              ...(filter.to !== undefined ? { lte: BigInt(filter.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as TimeEntryRow[]
}

export async function retrieveTimeEntry(
  tenantId: string,
  timeEntryId: string
): Promise<TimeEntryRow | null> {
  const row = await prisma.timeEntry.findFirst({
    where: { tenantId, id: timeEntryId, ...liveEntryWhere },
  })
  return row as unknown as TimeEntryRow | null
}

export async function retrieveRunningEntry(
  tenantId: string,
  userId: string
): Promise<TimeEntryRow | null> {
  const row = await prisma.timeEntry.findFirst({
    where: { tenantId, userId, endedAt: null, ...liveEntryWhere },
    orderBy: [{ startedAt: 'desc' }],
  })
  return row as unknown as TimeEntryRow | null
}

export async function updateTimeEntry(
  tenantId: string,
  timeEntryId: string,
  patch: UpdateTimeEntryParams
): Promise<TimeEntryRow> {
  const row = await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { ...patch },
  })
  return row as unknown as TimeEntryRow
}

export async function softDeleteTimeEntry(
  tenantId: string,
  timeEntryId: string,
  params: { deletedBy: string | null; deletionReason: string | null; deletedAt: bigint; updatedAt: bigint }
): Promise<TimeEntryRow> {
  const row = await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: { ...params },
  })
  return row as unknown as TimeEntryRow
}

export async function startTimerAtomic(params: StartTimerParams): Promise<{
  stopped: TimeEntryRow | null
  started: TimeEntryRow
}> {
  return prisma.$transaction(async (tx) => {
    const running = await tx.timeEntry.findFirst({
      where: {
        tenantId: params.tenantId,
        userId: params.userId,
        endedAt: null,
        deletedAt: null,
      },
      orderBy: [{ startedAt: 'desc' }],
    })
    let stopped: TimeEntryRow | null = null
    if (running) {
      const current = running as unknown as TimeEntryRow
      const startedAt = Number(current.startedAt)
      const endedAt = Number(params.now)
      const durationMinutes = durationMinutesBetween(startedAt, endedAt)
      const updated = await tx.timeEntry.update({
        where: { id: current.id },
        data: {
          endedAt: params.now,
          durationMinutes,
          updatedAt: params.now,
        },
      })
      stopped = updated as unknown as TimeEntryRow
    }
    const created = await tx.timeEntry.create({
      data: {
        id: params.id,
        tenantId: params.tenantId,
        projectId: params.projectId,
        issueId: params.issueId,
        milestoneId: params.milestoneId,
        taskListId: params.taskListId,
        userId: params.userId,
        startedAt: params.startedAt,
        endedAt: null,
        durationMinutes: null,
        billable: params.billable,
        note: params.note,
        approvalStatus: 'draft',
        timesheetId: null,
        createdBy: params.createdBy,
        createdAt: params.now,
        updatedAt: params.now,
      },
    })
    return { stopped, started: created as unknown as TimeEntryRow }
  })
}

export async function listTimesheetEntries(
  tenantId: string,
  timesheetId: string
): Promise<TimeEntryRow[]> {
  const rows = await prisma.timeEntry.findMany({
    where: { tenantId, timesheetId, ...liveEntryWhere },
    orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as TimeEntryRow[]
}

export async function attachEntriesToTimesheet(
  tenantId: string,
  entryIds: string[],
  timesheetId: string,
  now: bigint
): Promise<number> {
  if (entryIds.length === 0) return 0
  const result = await prisma.timeEntry.updateMany({
    where: { tenantId, id: { in: entryIds }, ...liveEntryWhere },
    data: { timesheetId, updatedAt: now },
  })
  return result.count
}

export async function setEntriesApprovalForTimesheet(
  tenantId: string,
  timesheetId: string,
  approvalStatus: string,
  now: bigint
): Promise<number> {
  const result = await prisma.timeEntry.updateMany({
    where: { tenantId, timesheetId, ...liveEntryWhere },
    data: { approvalStatus, updatedAt: now },
  })
  return result.count
}

export async function listEntriesForSummary(
  tenantId: string,
  filter: SummaryFilter
): Promise<TimeEntryRow[]> {
  const rows = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      ...liveEntryWhere,
      startedAt: { gte: BigInt(filter.from), lte: BigInt(filter.to) },
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.issueId ? { issueId: filter.issueId } : {}),
    },
    orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as TimeEntryRow[]
}

export async function createTimesheet(
  params: CreateTimesheetParams
): Promise<TimesheetRow> {
  const row = await prisma.timesheet.create({ data: params })
  return row as unknown as TimesheetRow
}

export async function listTimesheets(
  tenantId: string,
  filter: { userId?: string; status?: string }
): Promise<TimesheetRow[]> {
  const rows = await prisma.timesheet.findMany({
    where: {
      tenantId,
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  })
  return rows as unknown as TimesheetRow[]
}

export async function retrieveTimesheet(
  tenantId: string,
  timesheetId: string
): Promise<TimesheetRow | null> {
  const row = await prisma.timesheet.findFirst({
    where: { tenantId, id: timesheetId },
  })
  return row as unknown as TimesheetRow | null
}

export async function updateTimesheet(
  tenantId: string,
  timesheetId: string,
  patch: UpdateTimesheetParams
): Promise<TimesheetRow> {
  const row = await prisma.timesheet.update({
    where: { id: timesheetId },
    data: { ...patch },
  })
  return row as unknown as TimesheetRow
}

export async function createTimesheetEvent(
  params: CreateTimesheetEventParams
): Promise<TimesheetEventRow> {
  const row = await prisma.timesheetEvent.create({ data: params })
  return row as unknown as TimesheetEventRow
}

export async function listTimesheetEvents(
  tenantId: string,
  timesheetId: string
): Promise<TimesheetEventRow[]> {
  const rows = await prisma.timesheetEvent.findMany({
    where: { tenantId, timesheetId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as TimesheetEventRow[]
}
