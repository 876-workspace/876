import type { TimeEntry, Timesheet } from '@876/projects/contracts'
import type { TimesheetSummaryEntry } from '@876/projects-ui/timesheet-summary'
import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

import type { TimePeriod } from './time-period'

export function toTimesheetSummaryEntries(
  entries: readonly TimeEntry[],
  projectNames: ReadonlyMap<string, string>
): TimesheetSummaryEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    startedAt: entry.startedAt,
    durationMinutes: entry.durationMinutes ?? 0,
    billable: entry.billable,
    projectId: entry.projectId,
    projectName: projectNames.get(entry.projectId) ?? entry.projectId,
  }))
}

/**
 * One read of a user's entries serves both the period list and every sheet's
 * summary — a per-sheet detail fetch would be an N+1.
 */
function groupEntriesByTimesheet(
  entries: readonly TimeEntry[]
): ReadonlyMap<string, TimeEntry[]> {
  const groups = new Map<string, TimeEntry[]>()

  for (const entry of entries) {
    if (!entry.timesheetId) continue
    const group = groups.get(entry.timesheetId) ?? []
    group.push(entry)
    groups.set(entry.timesheetId, group)
  }

  return groups
}

/** The grouping in the plain-object shape a client component takes. */
export function toEntriesByTimesheet(
  entries: readonly TimeEntry[],
  projectNames: ReadonlyMap<string, string>
): Record<string, TimesheetSummaryEntry[]> {
  const byTimesheet: Record<string, TimesheetSummaryEntry[]> = {}

  for (const [timesheetId, group] of groupEntriesByTimesheet(entries))
    byTimesheet[timesheetId] = toTimesheetSummaryEntries(group, projectNames)

  return byTimesheet
}

export function entriesInPeriod(
  entries: readonly TimeEntry[],
  period: TimePeriod
): TimeEntry[] {
  return entries.filter(
    (entry) => entry.startedAt >= period.from && entry.startedAt <= period.to
  )
}

export function timesheetForPeriod(
  timesheets: readonly Timesheet[],
  period: TimePeriod
): Timesheet | null {
  return (
    timesheets.find(
      (timesheet) =>
        timesheet.periodStart === period.from && timesheet.periodEnd === period.to
    ) ?? null
  )
}

export function newestTimesheetFirst(
  timesheets: readonly Timesheet[]
): Timesheet[] {
  return [...timesheets].sort(
    (left, right) => right.periodStart - left.periodStart
  )
}

/** The real column set of a timesheet summary, so a fallback cannot drift. */
export const TIMESHEET_SKELETON_COLUMNS: DataTableSkeletonColumn[] = [
  { label: 'Project' },
  { label: 'Billable', width: '100px' },
  { label: 'Total', width: '100px' },
]
