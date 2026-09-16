import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

import { TimeEntriesPanel } from './time-entries-panel'
import { todayEntryDate } from './time-entry-input'
import { toTimeEntryRows } from './time-entry-rows'
import type { TimePeriod } from './time-period'
import {
  entriesInPeriod,
  newestTimesheetFirst,
  timesheetForPeriod,
  toEntriesByTimesheet,
} from './time-summary-rows'
import { TimesheetCard } from './timesheet-card'
import { TimesheetCreateButton } from './timesheet-create-button'
import { TimerPanel } from './timer-panel'
import { toTimerState } from './timer-state'

type Props = {
  orgId: string
  userId: string
  period: TimePeriod
  /** `new` opens the add form; any other value names the entry being edited. */
  entryParam?: string
  canEdit: boolean
}

/** This view's own URL for the period, so the form opens without losing it. */
function baseHref(period: TimePeriod): string {
  return `/time?from=${period.from}&to=${period.to}`
}

export async function MyTimeData({
  orgId,
  userId,
  period,
  entryParam,
  canEdit,
}: Props) {
  const [
    entriesResult,
    timesheetsResult,
    projectResult,
    timerResult,
    issuesResult,
    members,
  ] = await Promise.all([
    projects.timeEntries.list(orgId, { userId }),
    projects.timesheets.list(orgId, { userId }),
    projects.projects.list(orgId, { limit: 100 }),
    projects.timeEntries.currentTimer(orgId, userId),
    projects.issues.list(orgId, { limit: 100 }),
    loadMemberLabels(orgId),
  ])

  const loadError =
    entriesResult.error ??
    timesheetsResult.error ??
    projectResult.error ??
    timerResult.error ??
    issuesResult.error ??
    members.error
  const entries = entriesResult.data?.data ?? []
  const timesheets = newestTimesheetFirst(timesheetsResult.data?.data ?? [])
  const projectOptions = (projectResult.data?.data ?? []).map((project) => ({
    id: project.id,
    name: project.name,
  }))
  const projectNames = new Map(
    projectOptions.map((project) => [project.id, project.name])
  )
  const issueTitles = new Map(
    (issuesResult.data?.data ?? []).map((issue) => [issue.id, issue.title])
  )
  const periodEntries = entriesInPeriod(entries, period)
  const entriesByTimesheet = toEntriesByTimesheet(entries, projectNames)
  const periodSheet = timesheetForPeriod(timesheets, period)
  const editingEntry =
    entryParam && entryParam !== 'new'
      ? (periodEntries.find((entry) => entry.id === entryParam) ?? null)
      : null

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Some time data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}

      <TimerPanel
        timer={toTimerState(timerResult.data, projectNames)}
        projects={projectOptions}
        disabled={!canEdit}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Entries in this period</h2>
        <TimeEntriesPanel
          rows={toTimeEntryRows(periodEntries, { projectNames, issueTitles })}
          projects={projectOptions}
          baseHref={baseHref(period)}
          defaultDate={todayEntryDate()}
          canEdit={canEdit}
          createOpen={entryParam === 'new'}
          editingEntry={editingEntry}
          emptyTitle="No time logged in this period."
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Timesheets</h2>
          {canEdit && !periodSheet ? (
            <TimesheetCreateButton period={period} />
          ) : null}
        </div>

        {timesheets.length === 0 ? (
          <p className="text-muted-foreground text-sm">No timesheets yet.</p>
        ) : (
          timesheets.map((timesheet) => (
            <TimesheetCard
              key={timesheet.id}
              timesheet={timesheet}
              entries={entriesByTimesheet[timesheet.id] ?? []}
              isOwner={canEdit && timesheet.userId === userId}
              canApprove={false}
              submittedBy={members.labels[timesheet.userId] ?? null}
              decidedBy={
                timesheet.decidedBy
                  ? (members.labels[timesheet.decidedBy] ?? null)
                  : null
              }
            />
          ))
        )}
      </section>
    </div>
  )
}
