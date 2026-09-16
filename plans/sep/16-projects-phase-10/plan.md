# Implementation Plan: 876 Projects Phase 10 — Reports & Resource Planning

- **Run ID:** `2026-09-16-projects-phase-10`
- **Branch:** `feature/projects-phase-10-reports`
- **Status:** `IN_PROGRESS`

## Binding decisions
1. **Reports are read models derived on request**, never stored aggregates. One `reports` module in projects-api, integer maths, tenant-scoped, soft-deleted rows excluded.
2. **The only new table is member capacity** (`projects_member_capacity`: tenant, userId opaque, `minutesPerWeek` int, `effectiveFrom`/`effectiveTo` unix seconds, soft delete). Missing capacity = `null` utilisation, never 100% or 0%.
3. **Money stays integer minor units**; financial reports reuse `finance.calculations.ts` — no second cost/revenue calculation.
4. **CSV export** is produced by the API from the same report function (`?format=csv`), RFC 4180 quoting, formula-injection guard (prefix `'` to cells starting with `= + - @`).
5. **Canonical report contracts** (both lanes build against these exactly):

```ts
type ReportPeriod = { from: number; to: number } // unix seconds, to exclusive
type CountRow = { key: string; label: string; count: number }
type WorkReport = { object: 'projects.work-report'; period: ReportPeriod; byState: CountRow[]; byType: CountRow[]; byAssignee: CountRow[]; overdue: number; total: number }
type ProjectHealthRow = { projectId: string; name: string; health: 'on-track' | 'at-risk' | 'off-track' | 'unknown'; progressPercent: number | null; overdue: number; openItems: number; budgetConsumedPercent: number | null }
type HealthReport = { object: 'projects.health-report'; data: ProjectHealthRow[] }
type TimeReportRow = { key: string; label: string; billableMinutes: number; nonBillableMinutes: number }
type TimeReport = { object: 'projects.time-report'; groupBy: 'project' | 'user' | 'issue'; period: ReportPeriod; data: TimeReportRow[] }
type BudgetVarianceRow = { projectId: string; name: string; currency: string | null; budgetMinor: string | null; actualCostMinor: string | null; varianceMinor: string | null; budgetMinutes: number | null; actualMinutes: number }
type BudgetVarianceReport = { object: 'projects.budget-variance-report'; period: ReportPeriod; data: BudgetVarianceRow[] }
type WorkloadRow = { userId: string; label: string; assignedOpenItems: number; plannedMinutes: number; loggedMinutes: number; capacityMinutes: number | null; utilisationPercent: number | null }
type WorkloadReport = { object: 'projects.workload-report'; period: ReportPeriod; data: WorkloadRow[] }
```
Health rule: `off-track` if overdue items > 20% of open or budget consumed > 100%; `at-risk` if any overdue or budget > threshold; `unknown` if no open items and no budget; else `on-track`.

## Briefs
| Brief | Delegate | Scope |
| --- | --- | --- |
| briefs/codex/10a-api.md | Codex `-p muse` | capacity table, reports module, CSV, client resources |
| briefs/command-code/10b-ui.md | Command Code | projects-ui report components (against contracts above) |
| (after 10a) briefs/command-code/10c-app.md | Command Code | app pages/routes/dashboard |
