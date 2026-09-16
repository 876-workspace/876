import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import {
  nowUnixSeconds,
  nullableToDbUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import {
  budgetConsumption,
  plannedVsActual,
  priceEntries,
  type PricedEntryInput,
  type RateInput,
} from '../finance/index.js'
import * as tenants from '../tenants/index.js'
import * as repository from './reports.repository.js'
import type {
  BudgetVarianceQuery,
  CreateCapacityBody,
  ListCapacitiesQuery,
  TimeReportQuery,
  UpdateCapacityBody,
  WorkReportQuery,
  WorkloadQuery,
} from './reports.schemas.js'
import { toReportPeriod, type ReportPeriod } from './reports.schemas.js'
import {
  capacityEffectiveAt,
  capacityMinutesForPeriod,
  classifyHealth,
  countBy,
  isDeletedRow,
  isOpenIssue,
  isOverdueIssue,
  progressPercentFor,
  rangesOverlap,
  serializeCapacity,
  utilisationPercentFor,
  type BudgetVarianceReport,
  type BudgetVarianceRow,
  type HealthReport,
  type ProjectHealthRow,
  type ReportIssueRow,
  type ReportRateRow,
  type ReportTimeEntryRow,
  type SerializedCapacity,
  type SerializedCapacityTombstone,
  type TimeReport,
  type TimeReportRow,
  type WorkReport,
  type WorkloadReport,
  type WorkloadRow,
} from './reports.serializers.js'

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

type PeriodCheck =
  | { period: ReportPeriod; error: null }
  | { period: null; error: ProjectsError }

function checkPeriod(query: { from: number; to: number }): PeriodCheck {
  const period = toReportPeriod(query)
  if (!period)
    return { period: null, error: getError('projects/invalid-period') }
  return { period, error: null }
}

function liveIssues(rows: ReportIssueRow[]): ReportIssueRow[] {
  return rows.filter((row) => !isDeletedRow(row))
}

function liveEntries(rows: ReportTimeEntryRow[]): ReportTimeEntryRow[] {
  return rows.filter((row) => !isDeletedRow(row))
}

function toRateInput(row: ReportRateRow): RateInput {
  return {
    id: row.id,
    scope: row.scope as RateInput['scope'],
    projectId: row.projectId,
    userId: row.userId,
    billRateMinor: row.billRateMinor,
    costRateMinor: row.costRateMinor,
    effectiveFrom:
      row.effectiveFrom === null || row.effectiveFrom === undefined
        ? null
        : Number(row.effectiveFrom),
    effectiveTo:
      row.effectiveTo === null || row.effectiveTo === undefined
        ? null
        : Number(row.effectiveTo),
  }
}

function entryInputFor(
  entry: ReportTimeEntryRow
): PricedEntryInput {
  return {
    minutes: entry.durationMinutes ?? 0,
    billable: entry.billable,
    projectId: entry.projectId,
    userId: entry.userId,
    startedAt: Number(entry.startedAt),
  }
}

export async function getWorkReport(
  organizationId: string,
  query: WorkReportQuery
): Promise<ServiceResult<WorkReport>> {
  const checked = checkPeriod(query)
  if (checked.error || !checked.period)
    return { data: null, error: checked.error }
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }

  let projectId: string | undefined
  if (query.projectId) {
    const project = await repository.retrieveReportProject(
      resolved.tenant.id,
      query.projectId
    )
    if (!project)
      return { data: null, error: getError('projects/project-not-found') }
    projectId = project.id
  }

  const issues = liveIssues(
    await repository.listReportIssues(resolved.tenant.id, { projectId })
  )
  const now = nowUnixSeconds()
  const stateLabels = new Map(issues.map((issue) => [issue.status, issue.status]))
  const typeLabels = new Map(issues.map((issue) => [issue.typeKey, issue.typeKey]))
  const assigneeLabels = new Map<string, string>()
  for (const issue of issues) {
    const key = issue.assigneeUserId ?? 'unassigned'
    if (!assigneeLabels.has(key)) assigneeLabels.set(key, key)
  }
  return {
    data: {
      object: 'projects.work-report',
      period: checked.period,
      byState: countBy(
        issues.map((issue) => issue.status),
        stateLabels
      ),
      byType: countBy(
        issues.map((issue) => issue.typeKey),
        typeLabels
      ),
      byAssignee: countBy(
        issues.map((issue) => issue.assigneeUserId ?? 'unassigned'),
        assigneeLabels
      ),
      overdue: issues.filter((issue) => isOverdueIssue(issue, now)).length,
      total: issues.length,
    },
    error: null,
  }
}

export async function getHealthReport(
  organizationId: string
): Promise<ServiceResult<HealthReport>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const tenantId = resolved.tenant.id

  const [projects, issues, entries, budgets, rateRows] = await Promise.all([
    repository.listReportProjects(tenantId),
    repository.listReportIssues(tenantId, {}),
    repository.listReportTimeEntries(tenantId, {}),
    repository.listReportBudgets(tenantId, {}),
    repository.listReportRates(tenantId, {}),
  ])
  const live = liveIssues(issues)
  const priced = liveEntries(entries)
  const rates = rateRows.map(toRateInput)
  const now = nowUnixSeconds()

  const data: ProjectHealthRow[] = projects
    .filter((project) => project.archivedAt === null || project.archivedAt === undefined)
    .map((project) => {
      const projectIssues = live.filter(
        (issue) => issue.projectId === project.id
      )
      const open = projectIssues.filter(isOpenIssue)
      const overdue = open.filter((issue) =>
        isOverdueIssue(issue, now)
      ).length
      const closed = projectIssues.length - open.length
      const projectEntries = priced.filter(
        (entry) => entry.projectId === project.id
      )
      const { totals } = priceEntries(
        projectEntries.map(entryInputFor),
        rates
      )
      let budgetConsumedPercent: number | null = null
      let budgetOverThreshold = false
      let budgetOverBudget = false
      for (const budget of budgets) {
        if (budget.projectId !== project.id || budget.scope !== 'project')
          continue
        if (budget.amountMinor !== null && budget.amountMinor !== undefined) {
          const consumption = budgetConsumption(
            totals.costMinor,
            budget.amountMinor,
            budget.thresholdPercent
          )
          if (
            budgetConsumedPercent === null ||
            consumption.percent > budgetConsumedPercent
          )
            budgetConsumedPercent = consumption.percent
          budgetOverThreshold = budgetOverThreshold || consumption.overThreshold
          budgetOverBudget = budgetOverBudget || consumption.overBudget
        } else if (budget.hours !== null && budget.hours !== undefined) {
          const consumption = budgetConsumption(
            totals.totalMinutes,
            budget.hours * 60,
            budget.thresholdPercent
          )
          if (
            budgetConsumedPercent === null ||
            consumption.percent > budgetConsumedPercent
          )
            budgetConsumedPercent = consumption.percent
          budgetOverThreshold = budgetOverThreshold || consumption.overThreshold
          budgetOverBudget = budgetOverBudget || consumption.overBudget
        }
      }
      return {
        projectId: project.id,
        name: project.name,
        health: classifyHealth({
          openItems: open.length,
          overdue,
          budgetConsumedPercent,
          budgetOverThreshold,
          budgetOverBudget,
        }),
        progressPercent: progressPercentFor(projectIssues.length, closed),
        overdue,
        openItems: open.length,
        budgetConsumedPercent,
      }
    })

  return { data: { object: 'projects.health-report', data }, error: null }
}

export async function getTimeReport(
  organizationId: string,
  query: TimeReportQuery
): Promise<ServiceResult<TimeReport>> {
  const checked = checkPeriod(query)
  if (checked.error || !checked.period)
    return { data: null, error: checked.error }
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const tenantId = resolved.tenant.id

  let projectId: string | undefined
  if (query.projectId) {
    const project = await repository.retrieveReportProject(
      tenantId,
      query.projectId
    )
    if (!project)
      return { data: null, error: getError('projects/project-not-found') }
    projectId = project.id
  }

  const [entries, projects, issues] = await Promise.all([
    repository.listReportTimeEntries(tenantId, {
      projectId,
      from: checked.period.from,
      to: checked.period.to,
    }),
    repository.listReportProjects(tenantId),
    repository.listReportIssues(tenantId, { projectId }),
  ])
  const live = liveEntries(entries)
  const projectNames = new Map(projects.map((project) => [project.id, project.name]))
  const issueLabels = new Map(
    liveIssues(issues).map((issue) => [issue.id, issue.identifier])
  )

  const groups = new Map<string, { label: string; billable: number; nonBillable: number }>()
  for (const entry of live) {
    const minutes = entry.durationMinutes ?? 0
    let key: string
    let label: string
    if (query.groupBy === 'project') {
      key = entry.projectId
      label = projectNames.get(entry.projectId) ?? entry.projectId
    } else if (query.groupBy === 'user') {
      key = entry.userId
      label = entry.userId
    } else {
      key = entry.issueId ?? 'unassigned'
      label = entry.issueId ? (issueLabels.get(entry.issueId) ?? entry.issueId) : 'unassigned'
    }
    const bucket = groups.get(key) ?? { label, billable: 0, nonBillable: 0 }
    if (entry.billable) bucket.billable += minutes
    else bucket.nonBillable += minutes
    groups.set(key, bucket)
  }

  const data: TimeReportRow[] = [...groups.entries()]
    .map(([key, bucket]) => ({
      key,
      label: bucket.label,
      billableMinutes: bucket.billable,
      nonBillableMinutes: bucket.nonBillable,
    }))
    .sort((left, right) => left.key.localeCompare(right.key))

  return {
    data: {
      object: 'projects.time-report',
      groupBy: query.groupBy,
      period: checked.period,
      data,
    },
    error: null,
  }
}

export async function getBudgetVarianceReport(
  organizationId: string,
  query: BudgetVarianceQuery
): Promise<ServiceResult<BudgetVarianceReport>> {
  const checked = checkPeriod(query)
  if (checked.error || !checked.period)
    return { data: null, error: checked.error }
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const tenantId = resolved.tenant.id

  const [projects, entries, budgets, rateRows] = await Promise.all([
    repository.listReportProjects(tenantId),
    repository.listReportTimeEntries(tenantId, {
      from: checked.period.from,
      to: checked.period.to,
    }),
    repository.listReportBudgets(tenantId, {}),
    repository.listReportRates(tenantId, {}),
  ])
  const priced = liveEntries(entries)
  const rates = rateRows.map(toRateInput)
  const liveProjects = projects.filter(
    (project) => project.archivedAt === null || project.archivedAt === undefined
  )
  const billings = await Promise.all(
    liveProjects.map((project) =>
      repository.retrieveReportBilling(tenantId, project.id)
    )
  )

  const data: BudgetVarianceRow[] = liveProjects.map((project, index) => {
    const projectBudgets = budgets.filter(
      (budget) => budget.projectId === project.id && budget.scope === 'project'
    )
    const amountBudgets = projectBudgets.filter(
      (budget) => budget.amountMinor !== null && budget.amountMinor !== undefined
    )
    const hoursBudgets = projectBudgets.filter(
      (budget) => budget.hours !== null && budget.hours !== undefined
    )
    const budgetTotal =
      amountBudgets.length > 0
        ? amountBudgets.reduce(
            (sum, budget) => sum + (budget.amountMinor as number),
            0
          )
        : null
    const projectEntries = priced.filter(
      (entry) => entry.projectId === project.id
    )
    const { totals } = priceEntries(
      projectEntries.map(entryInputFor),
      rates
    )
    const comparison = plannedVsActual(budgetTotal, totals.costMinor)
    return {
      projectId: project.id,
      name: project.name,
      currency: billings[index]?.currency ?? null,
      budgetMinor: budgetTotal === null ? null : String(budgetTotal),
      actualCostMinor: String(totals.costMinor),
      varianceMinor:
        comparison.variance === null ? null : String(comparison.variance),
      budgetMinutes:
        hoursBudgets.length > 0
          ? hoursBudgets.reduce(
              (sum, budget) => sum + (budget.hours as number) * 60,
              0
            )
          : null,
      actualMinutes: totals.totalMinutes,
    }
  })

  return {
    data: {
      object: 'projects.budget-variance-report',
      period: checked.period,
      data,
    },
    error: null,
  }
}

export async function getWorkloadReport(
  organizationId: string,
  query: WorkloadQuery
): Promise<ServiceResult<WorkloadReport>> {
  const checked = checkPeriod(query)
  if (checked.error || !checked.period)
    return { data: null, error: checked.error }
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const tenantId = resolved.tenant.id
  const period = checked.period

  let projectId: string | undefined
  if (query.projectId) {
    const project = await repository.retrieveReportProject(
      tenantId,
      query.projectId
    )
    if (!project)
      return { data: null, error: getError('projects/project-not-found') }
    projectId = project.id
  }

  const [issues, entries, capacities] = await Promise.all([
    repository.listReportIssues(tenantId, { projectId }),
    repository.listReportTimeEntries(tenantId, { projectId, from: period.from, to: period.to }),
    repository.listCapacities(tenantId, {}),
  ])
  const open = liveIssues(issues).filter(isOpenIssue)
  const priced = liveEntries(entries)

  const userIds = new Set<string>()
  for (const issue of open) {
    if (issue.assigneeUserId) userIds.add(issue.assigneeUserId)
  }
  for (const entry of priced) userIds.add(entry.userId)

  const data: WorkloadRow[] = [...userIds]
    .sort()
    .map((userId) => {
      const assigned = open.filter(
        (issue) => issue.assigneeUserId === userId
      )
      const loggedMinutes = priced
        .filter((entry) => entry.userId === userId)
        .reduce((sum, entry) => sum + (entry.durationMinutes ?? 0), 0)
      const capacity = capacityEffectiveAt(capacities, userId, period.from)
      const capacityMinutes =
        capacity === null
          ? null
          : capacityMinutesForPeriod(capacity.minutesPerWeek, period)
      return {
        userId,
        label: userId,
        assignedOpenItems: assigned.length,
        // Issues carry a points estimate, not an effort duration; summing
        // points as minutes would invent a number. Zero until effort exists.
        plannedMinutes: 0,
        loggedMinutes,
        capacityMinutes,
        utilisationPercent: utilisationPercentFor(loggedMinutes, capacityMinutes),
      }
    })

  return {
    data: { object: 'projects.workload-report', period, data },
    error: null,
  }
}

export async function listCapacities(
  organizationId: string,
  query: ListCapacitiesQuery
): Promise<ServiceResult<SerializedCapacity[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const rows = await repository.listCapacities(resolved.tenant.id, {
    userId: query.userId,
  })
  return {
    data: rows.filter((row) => !isDeletedRow(row)).map(serializeCapacity),
    error: null,
  }
}

export async function createCapacity(
  organizationId: string,
  body: CreateCapacityBody
): Promise<ServiceResult<SerializedCapacity>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const existing = await repository.listCapacities(resolved.tenant.id, {
    userId: body.userId,
  })
  const candidate = {
    effectiveFrom: body.effectiveFrom,
    effectiveTo: body.effectiveTo ?? null,
  }
  for (const row of existing) {
    if (isDeletedRow(row)) continue
    if (
      rangesOverlap(candidate, {
        effectiveFrom: Number(row.effectiveFrom),
        effectiveTo:
          row.effectiveTo === null || row.effectiveTo === undefined
            ? null
            : Number(row.effectiveTo),
      })
    )
      return { data: null, error: getError('projects/capacity-overlap') }
  }
  const now = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createCapacity({
    id: generateId('memberCapacity'),
    tenantId: resolved.tenant.id,
    userId: body.userId,
    minutesPerWeek: body.minutesPerWeek,
    effectiveFrom: toDbUnixSeconds(body.effectiveFrom),
    effectiveTo: nullableToDbUnixSeconds(body.effectiveTo),
    createdAt: now,
    updatedAt: now,
  })
  return { data: serializeCapacity(row), error: null }
}

export async function updateCapacity(
  organizationId: string,
  capacityId: string,
  body: UpdateCapacityBody
): Promise<ServiceResult<SerializedCapacity>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const current = await repository.retrieveCapacity(
    resolved.tenant.id,
    capacityId
  )
  if (!current)
    return { data: null, error: getError('projects/capacity-not-found') }

  const merged = {
    minutesPerWeek: body.minutesPerWeek ?? current.minutesPerWeek,
    effectiveFrom: body.effectiveFrom ?? Number(current.effectiveFrom),
    effectiveTo:
      body.effectiveTo !== undefined
        ? body.effectiveTo
        : current.effectiveTo === null || current.effectiveTo === undefined
          ? null
          : Number(current.effectiveTo),
  }
  if (merged.effectiveTo !== null && merged.effectiveTo <= merged.effectiveFrom)
    return {
      data: null,
      error: getError('projects/invalid-request', {
        param: 'effectiveTo',
        description: 'effectiveTo must be after effectiveFrom.',
      }),
    }

  const siblings = await repository.listCapacities(resolved.tenant.id, {
    userId: current.userId,
  })
  for (const row of siblings) {
    if (row.id === current.id || isDeletedRow(row)) continue
    if (
      rangesOverlap(merged, {
        effectiveFrom: Number(row.effectiveFrom),
        effectiveTo:
          row.effectiveTo === null || row.effectiveTo === undefined
            ? null
            : Number(row.effectiveTo),
      })
    )
      return { data: null, error: getError('projects/capacity-overlap') }
  }

  const row = await repository.updateCapacity(current.id, {
    minutesPerWeek: merged.minutesPerWeek,
    effectiveFrom: toDbUnixSeconds(merged.effectiveFrom),
    effectiveTo: nullableToDbUnixSeconds(merged.effectiveTo),
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  return { data: serializeCapacity(row), error: null }
}

export async function removeCapacity(
  organizationId: string,
  capacityId: string
): Promise<ServiceResult<SerializedCapacityTombstone>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error || !resolved.tenant)
    return { data: null, error: resolved.error }
  const current = await repository.retrieveCapacity(
    resolved.tenant.id,
    capacityId
  )
  if (!current)
    return { data: null, error: getError('projects/capacity-not-found') }
  const now = toDbUnixSeconds(nowUnixSeconds())
  await repository.softDeleteCapacity(current.id, {
    deletedAt: now,
    deletedBy: null,
    deletionReason: null,
    updatedAt: now,
  })
  return {
    data: {
      object: 'projects.member-capacity',
      id: current.id,
      deleted: true,
    },
    error: null,
  }
}
