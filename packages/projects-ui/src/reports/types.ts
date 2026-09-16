/** Canonical report contracts — plans/sep/16-projects-phase-10/plan.md §5. */

type ReportPeriod = { from: number; to: number } // unix seconds, to exclusive
type CountRow = { key: string; label: string; count: number }
type WorkReport = {
  object: 'projects.work-report'
  period: ReportPeriod
  byState: CountRow[]
  byType: CountRow[]
  byAssignee: CountRow[]
  overdue: number
  total: number
}
type ProjectHealthRow = {
  projectId: string
  name: string
  health: 'on-track' | 'at-risk' | 'off-track' | 'unknown'
  progressPercent: number | null
  overdue: number
  openItems: number
  budgetConsumedPercent: number | null
}
type HealthReport = {
  object: 'projects.health-report'
  data: ProjectHealthRow[]
}
type TimeReportRow = {
  key: string
  label: string
  billableMinutes: number
  nonBillableMinutes: number
}
type TimeReport = {
  object: 'projects.time-report'
  groupBy: 'project' | 'user' | 'issue'
  period: ReportPeriod
  data: TimeReportRow[]
}
type BudgetVarianceRow = {
  projectId: string
  name: string
  currency: string | null
  budgetMinor: string | null
  actualCostMinor: string | null
  varianceMinor: string | null
  budgetMinutes: number | null
  actualMinutes: number
}
type BudgetVarianceReport = {
  object: 'projects.budget-variance-report'
  period: ReportPeriod
  data: BudgetVarianceRow[]
}
type WorkloadRow = {
  userId: string
  label: string
  assignedOpenItems: number
  plannedMinutes: number
  loggedMinutes: number
  capacityMinutes: number | null
  utilisationPercent: number | null
}
type WorkloadReport = {
  object: 'projects.workload-report'
  period: ReportPeriod
  data: WorkloadRow[]
}

export type {
  ReportPeriod,
  CountRow,
  WorkReport,
  ProjectHealthRow,
  HealthReport,
  TimeReportRow,
  TimeReport,
  BudgetVarianceRow,
  BudgetVarianceReport,
  WorkloadRow,
  WorkloadReport,
}
