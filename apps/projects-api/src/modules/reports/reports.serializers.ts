import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
import type { ReportPeriod } from './reports.schemas.js'

type Timestamp = bigint | number

export type CapacityRow = {
  id: string
  tenantId: string
  userId: string
  minutesPerWeek: number
  effectiveFrom: Timestamp
  effectiveTo: Timestamp | null
  deletedAt: Timestamp | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type ReportProjectRow = {
  id: string
  tenantId: string
  name: string
  key: string
  archivedAt: Timestamp | null
}

export type ReportIssueRow = {
  id: string
  tenantId: string
  projectId: string
  identifier: string
  title: string
  status: string
  typeKey: string
  assigneeUserId: string | null
  estimate: number | null
  dueDate: Timestamp | null
  deletedAt: Timestamp | null
}

export type ReportTimeEntryRow = {
  id: string
  tenantId: string
  projectId: string
  issueId: string | null
  userId: string
  startedAt: Timestamp
  durationMinutes: number | null
  billable: boolean
  deletedAt: Timestamp | null
}

export type ReportBudgetRow = {
  id: string
  tenantId: string
  projectId: string
  scope: string
  amountMinor: number | null
  hours: number | null
  thresholdPercent: number
}

export type ReportRateRow = {
  id: string
  tenantId: string
  projectId: string | null
  userId: string | null
  scope: string
  billRateMinor: number
  costRateMinor: number
  effectiveFrom: Timestamp | null
  effectiveTo: Timestamp | null
}

export type ReportBillingRow = {
  projectId: string
  currency: string
}

export type CountRow = { key: string; label: string; count: number }

export type WorkReport = {
  object: 'projects.work-report'
  period: ReportPeriod
  byState: CountRow[]
  byType: CountRow[]
  byAssignee: CountRow[]
  overdue: number
  total: number
}

export type ProjectHealth = 'on-track' | 'at-risk' | 'off-track' | 'unknown'

export type ProjectHealthRow = {
  projectId: string
  name: string
  health: ProjectHealth
  progressPercent: number | null
  overdue: number
  openItems: number
  budgetConsumedPercent: number | null
}

export type HealthReport = {
  object: 'projects.health-report'
  data: ProjectHealthRow[]
}

export type TimeReportRow = {
  key: string
  label: string
  billableMinutes: number
  nonBillableMinutes: number
}

export type TimeReport = {
  object: 'projects.time-report'
  groupBy: 'project' | 'user' | 'issue'
  period: ReportPeriod
  data: TimeReportRow[]
}

export type BudgetVarianceRow = {
  projectId: string
  name: string
  currency: string | null
  budgetMinor: string | null
  actualCostMinor: string | null
  varianceMinor: string | null
  budgetMinutes: number | null
  actualMinutes: number
}

export type BudgetVarianceReport = {
  object: 'projects.budget-variance-report'
  period: ReportPeriod
  data: BudgetVarianceRow[]
}

export type WorkloadRow = {
  userId: string
  label: string
  assignedOpenItems: number
  plannedMinutes: number
  loggedMinutes: number
  capacityMinutes: number | null
  utilisationPercent: number | null
}

export type WorkloadReport = {
  object: 'projects.workload-report'
  period: ReportPeriod
  data: WorkloadRow[]
}

export type SerializedCapacity = {
  object: 'projects.member-capacity'
  id: string
  tenantId: string
  userId: string
  minutesPerWeek: number
  effectiveFrom: number
  effectiveTo: number | null
  createdAt: number
  updatedAt: number
}

export type SerializedCapacityTombstone = {
  object: 'projects.member-capacity'
  id: string
  deleted: true
}

export function serializeCapacity(row: CapacityRow): SerializedCapacity {
  return {
    object: 'projects.member-capacity',
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    minutesPerWeek: row.minutesPerWeek,
    effectiveFrom: fromDbUnixSeconds(row.effectiveFrom),
    effectiveTo: nullableFromDbUnixSeconds(row.effectiveTo),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function isDeletedRow(row: { deletedAt: Timestamp | null }): boolean {
  return row.deletedAt !== null && row.deletedAt !== undefined
}

const CLOSED_ISSUE_STATUSES = new Set(['done', 'canceled'])

export function isOpenIssue(row: Pick<ReportIssueRow, 'status'>): boolean {
  return !CLOSED_ISSUE_STATUSES.has(row.status)
}

export function isOverdueIssue(
  row: Pick<ReportIssueRow, 'status' | 'dueDate'>,
  now: number
): boolean {
  if (!isOpenIssue(row)) return false
  if (row.dueDate === null || row.dueDate === undefined) return false
  return Number(row.dueDate) < now
}

export function countBy(
  keys: string[],
  labels: Map<string, string>
): CountRow[] {
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: labels.get(key) ?? key, count }))
    .sort((left, right) =>
      right.count === left.count
        ? left.key.localeCompare(right.key)
        : right.count - left.count
    )
}

export function classifyHealth(input: {
  openItems: number
  overdue: number
  budgetConsumedPercent: number | null
  budgetOverThreshold: boolean
  budgetOverBudget: boolean
}): ProjectHealth {
  if (input.openItems === 0 && input.budgetConsumedPercent === null)
    return 'unknown'
  if (
    (input.openItems > 0 && input.overdue / input.openItems > 0.2) ||
    input.budgetOverBudget
  )
    return 'off-track'
  if (input.overdue > 0 || input.budgetOverThreshold) return 'at-risk'
  return 'on-track'
}

export function progressPercentFor(total: number, closed: number): number | null {
  if (total === 0) return null
  return Math.floor((closed * 100) / total)
}

const SECONDS_PER_WEEK = 604800

export function capacityMinutesForPeriod(
  minutesPerWeek: number,
  period: ReportPeriod
): number {
  return Math.round((minutesPerWeek * (period.to - period.from)) / SECONDS_PER_WEEK)
}

export function utilisationPercentFor(
  loggedMinutes: number,
  capacityMinutes: number | null
): number | null {
  if (capacityMinutes === null || capacityMinutes <= 0) return null
  return Math.round((loggedMinutes * 100) / capacityMinutes)
}

export function capacityEffectiveAt(
  rows: CapacityRow[],
  userId: string,
  at: number
): CapacityRow | null {
  for (const row of rows) {
    if (row.userId !== userId || isDeletedRow(row)) continue
    const from = Number(row.effectiveFrom)
    const to =
      row.effectiveTo === null || row.effectiveTo === undefined
        ? null
        : Number(row.effectiveTo)
    if (from <= at && (to === null || at < to)) return row
  }
  return null
}

export function rangesOverlap(
  left: { effectiveFrom: number; effectiveTo: number | null },
  right: { effectiveFrom: number; effectiveTo: number | null }
): boolean {
  const leftTo = left.effectiveTo ?? Number.POSITIVE_INFINITY
  const rightTo = right.effectiveTo ?? Number.POSITIVE_INFINITY
  return left.effectiveFrom < rightTo && right.effectiveFrom < leftTo
}

const CSV_FORMULA_LEAD = new Set(['=', '+', '-', '@'])

function isPlainNumberText(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value)
}

export function guardCsvCell(value: string): string {
  if (value.length === 0) return value
  const lead = value.charAt(0)
  if (!CSV_FORMULA_LEAD.has(lead) || isPlainNumberText(value)) return value
  return `'${value}`
}

export function escapeCsvCell(value: string): string {
  const guarded = guardCsvCell(value)
  if (
    guarded.includes(',') ||
    guarded.includes('"') ||
    guarded.includes('\n') ||
    guarded.includes('\r')
  )
    return `"${guarded.replaceAll('"', '""')}"`
  return guarded
}

function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  return escapeCsvCell(String(value))
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [
    headers.map((header) => escapeCsvCell(header)).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ]
  return `${lines.join('\r\n')}\r\n`
}

export function workReportToCsv(report: WorkReport): string {
  const rows: Array<Array<string | number | null>> = []
  for (const row of report.byState)
    rows.push(['state', row.key, row.label, row.count])
  for (const row of report.byType)
    rows.push(['type', row.key, row.label, row.count])
  for (const row of report.byAssignee)
    rows.push(['assignee', row.key, row.label, row.count])
  rows.push(['summary', 'total', 'Total issues', report.total])
  rows.push(['summary', 'overdue', 'Overdue issues', report.overdue])
  return toCsv(['section', 'key', 'label', 'count'], rows)
}

export function healthReportToCsv(report: HealthReport): string {
  return toCsv(
    [
      'projectId',
      'name',
      'health',
      'progressPercent',
      'overdue',
      'openItems',
      'budgetConsumedPercent',
    ],
    report.data.map((row) => [
      row.projectId,
      row.name,
      row.health,
      row.progressPercent,
      row.overdue,
      row.openItems,
      row.budgetConsumedPercent,
    ])
  )
}

export function timeReportToCsv(report: TimeReport): string {
  return toCsv(
    ['key', 'label', 'billableMinutes', 'nonBillableMinutes'],
    report.data.map((row) => [
      row.key,
      row.label,
      row.billableMinutes,
      row.nonBillableMinutes,
    ])
  )
}

export function budgetVarianceReportToCsv(report: BudgetVarianceReport): string {
  return toCsv(
    [
      'projectId',
      'name',
      'currency',
      'budgetMinor',
      'actualCostMinor',
      'varianceMinor',
      'budgetMinutes',
      'actualMinutes',
    ],
    report.data.map((row) => [
      row.projectId,
      row.name,
      row.currency,
      row.budgetMinor,
      row.actualCostMinor,
      row.varianceMinor,
      row.budgetMinutes,
      row.actualMinutes,
    ])
  )
}

export function workloadReportToCsv(report: WorkloadReport): string {
  return toCsv(
    [
      'userId',
      'label',
      'assignedOpenItems',
      'plannedMinutes',
      'loggedMinutes',
      'capacityMinutes',
      'utilisationPercent',
    ],
    report.data.map((row) => [
      row.userId,
      row.label,
      row.assignedOpenItems,
      row.plannedMinutes,
      row.loggedMinutes,
      row.capacityMinutes,
      row.utilisationPercent,
    ])
  )
}
