import { prisma } from '../../db/index.js'
import type {
  CapacityRow,
  ReportBillingRow,
  ReportBudgetRow,
  ReportIssueRow,
  ReportProjectRow,
  ReportRateRow,
  ReportTimeEntryRow,
} from './reports.serializers.js'

export type CreateCapacityParams = {
  id: string
  tenantId: string
  userId: string
  minutesPerWeek: number
  effectiveFrom: bigint
  effectiveTo: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateCapacityParams = {
  minutesPerWeek?: number
  effectiveFrom?: bigint
  effectiveTo?: bigint | null
  updatedAt: bigint
}

const liveCapacityWhere = { deletedAt: null } as const

export async function listCapacities(
  tenantId: string,
  filter: { userId?: string }
): Promise<CapacityRow[]> {
  const rows = await prisma.memberCapacity.findMany({
    where: {
      tenantId,
      ...liveCapacityWhere,
      ...(filter.userId ? { userId: filter.userId } : {}),
    },
    orderBy: [{ userId: 'asc' }, { effectiveFrom: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as CapacityRow[]
}

export async function retrieveCapacity(
  tenantId: string,
  capacityId: string
): Promise<CapacityRow | null> {
  const row = await prisma.memberCapacity.findFirst({
    where: { tenantId, id: capacityId, ...liveCapacityWhere },
  })
  return row as unknown as CapacityRow | null
}

export async function createCapacity(
  params: CreateCapacityParams
): Promise<CapacityRow> {
  const row = await prisma.memberCapacity.create({ data: params })
  return row as unknown as CapacityRow
}

export async function updateCapacity(
  capacityId: string,
  params: UpdateCapacityParams
): Promise<CapacityRow> {
  const row = await prisma.memberCapacity.update({
    where: { id: capacityId },
    data: { ...params },
  })
  return row as unknown as CapacityRow
}

export async function softDeleteCapacity(
  capacityId: string,
  params: {
    deletedAt: bigint
    deletedBy: string | null
    deletionReason: string | null
    updatedAt: bigint
  }
): Promise<CapacityRow> {
  const row = await prisma.memberCapacity.update({
    where: { id: capacityId },
    data: params,
  })
  return row as unknown as CapacityRow
}

export async function listReportProjects(
  tenantId: string
): Promise<ReportProjectRow[]> {
  const rows = await prisma.project.findMany({
    where: { tenantId, archivedAt: null },
    select: {
      id: true,
      tenantId: true,
      name: true,
      key: true,
      archivedAt: true,
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as ReportProjectRow[]
}

export async function retrieveReportProject(
  tenantId: string,
  projectIdOrKey: string
): Promise<ReportProjectRow | null> {
  if (projectIdOrKey.startsWith('prj_')) {
    const row = await prisma.project.findFirst({
      where: { tenantId, id: projectIdOrKey, archivedAt: null },
      select: {
        id: true,
        tenantId: true,
        name: true,
        key: true,
        archivedAt: true,
      },
    })
    if (row) return row as unknown as ReportProjectRow
  }
  const keyed = await prisma.project.findFirst({
    where: {
      tenantId,
      key: projectIdOrKey.toUpperCase(),
      archivedAt: null,
    },
    select: {
      id: true,
      tenantId: true,
      name: true,
      key: true,
      archivedAt: true,
    },
  })
  return keyed as unknown as ReportProjectRow | null
}

export async function listReportIssues(
  tenantId: string,
  filter: { projectId?: string }
): Promise<ReportIssueRow[]> {
  const rows = await prisma.issue.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
    },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      identifier: true,
      title: true,
      status: true,
      typeKey: true,
      assigneeUserId: true,
      estimate: true,
      dueDate: true,
      deletedAt: true,
    },
    orderBy: [{ id: 'asc' }],
  })
  return rows as unknown as ReportIssueRow[]
}

export async function listReportTimeEntries(
  tenantId: string,
  filter: { projectId?: string; from?: number; to?: number }
): Promise<ReportTimeEntryRow[]> {
  const rows = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      deletedAt: null,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
      ...(filter.from !== undefined || filter.to !== undefined
        ? {
            startedAt: {
              ...(filter.from !== undefined
                ? { gte: BigInt(filter.from) }
                : {}),
              ...(filter.to !== undefined ? { lt: BigInt(filter.to) } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      issueId: true,
      userId: true,
      startedAt: true,
      durationMinutes: true,
      billable: true,
      deletedAt: true,
    },
    orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as ReportTimeEntryRow[]
}

export async function listReportBudgets(
  tenantId: string,
  filter: { projectId?: string }
): Promise<ReportBudgetRow[]> {
  const rows = await prisma.budget.findMany({
    where: {
      tenantId,
      ...(filter.projectId ? { projectId: filter.projectId } : {}),
    },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      scope: true,
      amountMinor: true,
      hours: true,
      thresholdPercent: true,
    },
    orderBy: [{ id: 'asc' }],
  })
  return rows as unknown as ReportBudgetRow[]
}

export async function listReportRates(
  tenantId: string,
  filter: { projectId?: string }
): Promise<ReportRateRow[]> {
  const rows = await prisma.rate.findMany({
    where: {
      tenantId,
      ...(filter.projectId
        ? { OR: [{ projectId: filter.projectId }, { projectId: null }] }
        : {}),
    },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      userId: true,
      scope: true,
      billRateMinor: true,
      costRateMinor: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
    orderBy: [{ id: 'asc' }],
  })
  return rows as unknown as ReportRateRow[]
}

export async function retrieveReportBilling(
  tenantId: string,
  projectId: string
): Promise<ReportBillingRow | null> {
  const row = await prisma.projectBilling.findFirst({
    where: { tenantId, projectId },
    select: { projectId: true, currency: true },
  })
  return row as unknown as ReportBillingRow | null
}
