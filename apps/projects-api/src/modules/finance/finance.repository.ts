import { prisma } from '../../db/index.js'
import type {
  BudgetRow,
  ProjectBillingRow,
  RateRow,
} from './finance.serializers.js'

export type UpsertBillingParams = {
  id: string
  tenantId: string
  projectId: string
  billingMethod: string
  currency: string
  billingCustomerId: string | null
  fixedFeeAmount: number | null
  createdAt: bigint
  updatedAt: bigint
}

export type CreateBudgetParams = {
  id: string
  tenantId: string
  projectId: string
  scope: string
  milestoneId: string | null
  userId: string | null
  amountMinor: number | null
  hours: number | null
  thresholdPercent: number
  periodStart: bigint | null
  periodEnd: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateBudgetParams = {
  milestoneId?: string | null
  userId?: string | null
  amountMinor?: number | null
  hours?: number | null
  thresholdPercent?: number
  periodStart?: bigint | null
  periodEnd?: bigint | null
  updatedAt: bigint
}

export type CreateRateParams = {
  id: string
  tenantId: string
  projectId: string | null
  userId: string | null
  scope: string
  billRateMinor: number
  costRateMinor: number
  currency: string
  effectiveFrom: bigint | null
  effectiveTo: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export type UpdateRateParams = {
  userId?: string | null
  billRateMinor?: number
  costRateMinor?: number
  currency?: string
  effectiveFrom?: bigint | null
  effectiveTo?: bigint | null
  updatedAt: bigint
}

export type FinanceTimeEntryRow = {
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  userId: string
  startedAt: bigint
  durationMinutes: number | null
  billable: boolean
  approvalStatus: string
  billedInvoiceId: string | null
}

export type PlannedIssueRow = {
  id: string
  plannedDurationMinutes: number | null
  assigneeUserId: string | null
  milestoneId: string | null
}

export async function retrieveBilling(
  tenantId: string,
  projectId: string
): Promise<ProjectBillingRow | null> {
  const row = await prisma.projectBilling.findFirst({
    where: { tenantId, projectId },
  })
  return row as unknown as ProjectBillingRow | null
}

export async function upsertBilling(
  params: UpsertBillingParams
): Promise<ProjectBillingRow> {
  const row = await prisma.projectBilling.upsert({
    where: { projectId: params.projectId },
    create: { ...params },
    update: {
      billingMethod: params.billingMethod,
      currency: params.currency,
      billingCustomerId: params.billingCustomerId,
      fixedFeeAmount: params.fixedFeeAmount,
      updatedAt: params.updatedAt,
    },
  })
  return row as unknown as ProjectBillingRow
}

export async function listBudgets(
  tenantId: string,
  projectId: string
): Promise<BudgetRow[]> {
  const rows = await prisma.budget.findMany({
    where: { tenantId, projectId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as BudgetRow[]
}

export async function retrieveBudget(
  tenantId: string,
  budgetId: string
): Promise<BudgetRow | null> {
  const row = await prisma.budget.findFirst({
    where: { tenantId, id: budgetId },
  })
  return row as unknown as BudgetRow | null
}

export async function createBudget(
  params: CreateBudgetParams
): Promise<BudgetRow> {
  const row = await prisma.budget.create({ data: { ...params } })
  return row as unknown as BudgetRow
}

export async function updateBudget(
  budgetId: string,
  patch: UpdateBudgetParams
): Promise<BudgetRow> {
  const row = await prisma.budget.update({
    where: { id: budgetId },
    data: { ...patch },
  })
  return row as unknown as BudgetRow
}

export async function deleteBudget(
  tenantId: string,
  budgetId: string
): Promise<void> {
  await prisma.budget.deleteMany({ where: { tenantId, id: budgetId } })
}

export async function listRates(
  tenantId: string,
  projectId: string
): Promise<RateRow[]> {
  const rows = await prisma.rate.findMany({
    where: { tenantId, OR: [{ projectId }, { projectId: null }] },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as RateRow[]
}

export async function retrieveRate(
  tenantId: string,
  rateId: string
): Promise<RateRow | null> {
  const row = await prisma.rate.findFirst({
    where: { tenantId, id: rateId },
  })
  return row as unknown as RateRow | null
}

export async function createRate(params: CreateRateParams): Promise<RateRow> {
  const row = await prisma.rate.create({ data: { ...params } })
  return row as unknown as RateRow
}

export async function updateRate(
  rateId: string,
  patch: UpdateRateParams
): Promise<RateRow> {
  const row = await prisma.rate.update({
    where: { id: rateId },
    data: { ...patch },
  })
  return row as unknown as RateRow
}

export async function deleteRate(
  tenantId: string,
  rateId: string
): Promise<void> {
  await prisma.rate.deleteMany({ where: { tenantId, id: rateId } })
}

const liveEntryWhere = { deletedAt: null }

export async function listSummaryEntries(
  tenantId: string,
  projectId: string,
  from: bigint,
  to: bigint
): Promise<FinanceTimeEntryRow[]> {
  const rows = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      projectId,
      ...liveEntryWhere,
      startedAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      milestoneId: true,
      userId: true,
      startedAt: true,
      durationMinutes: true,
      billable: true,
      approvalStatus: true,
      billedInvoiceId: true,
    },
    orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as FinanceTimeEntryRow[]
}

export async function listPeriodBillableEntries(
  tenantId: string,
  projectId: string,
  from: bigint,
  to: bigint
): Promise<FinanceTimeEntryRow[]> {
  const rows = await prisma.timeEntry.findMany({
    where: {
      tenantId,
      projectId,
      ...liveEntryWhere,
      billable: true,
      approvalStatus: 'approved',
      startedAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      tenantId: true,
      projectId: true,
      milestoneId: true,
      userId: true,
      startedAt: true,
      durationMinutes: true,
      billable: true,
      approvalStatus: true,
      billedInvoiceId: true,
    },
    orderBy: [{ startedAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as FinanceTimeEntryRow[]
}

export async function listPlannedIssues(
  tenantId: string,
  projectId: string
): Promise<PlannedIssueRow[]> {
  const rows = await prisma.issue.findMany({
    where: { tenantId, projectId, deletedAt: null },
    select: {
      id: true,
      plannedDurationMinutes: true,
      assigneeUserId: true,
      milestoneId: true,
    },
    orderBy: [{ id: 'asc' }],
  })
  return rows as unknown as PlannedIssueRow[]
}

export async function markEntriesBilled(
  tenantId: string,
  entryIds: string[],
  invoiceId: string,
  now: bigint
): Promise<number> {
  if (entryIds.length === 0) return 0
  return prisma.$transaction(async (tx) => {
    const result = await tx.timeEntry.updateMany({
      where: { tenantId, id: { in: entryIds }, billedInvoiceId: null },
      data: { billedInvoiceId: invoiceId, billedAt: now, updatedAt: now },
    })
    return result.count
  })
}
