import { AppError } from '@876/ui/app-error'

import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

import { toEntriesByTimesheet } from './time-summary-rows'
import { TimesheetCard } from './timesheet-card'

/**
 * Everything waiting on a decision, with the entries each decision covers.
 *
 * The entries of every submitted sheet come from one org-wide read grouped by
 * `timesheetId`, so an approver sees the work without a request per sheet.
 */
export async function TimesheetApprovalsData({
  orgId,
  userId,
}: {
  orgId: string
  userId: string
}) {
  const [timesheetsResult, entriesResult, projectResult, members] =
    await Promise.all([
      projects.timesheets.list(orgId, { status: 'submitted' }),
      projects.timeEntries.list(orgId, { approvalStatus: 'submitted' }),
      projects.projects.list(orgId, { limit: 100 }),
      loadMemberLabels(orgId),
    ])

  const loadError =
    timesheetsResult.error ??
    entriesResult.error ??
    projectResult.error ??
    members.error
  const timesheets = timesheetsResult.data?.data ?? []
  const projectNames = new Map(
    (projectResult.data?.data ?? []).map((project) => [
      project.id,
      project.name,
    ])
  )
  const entriesByTimesheet = toEntriesByTimesheet(
    entriesResult.data?.data ?? [],
    projectNames
  )

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some timesheet data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}

      {timesheets.length === 0 ? (
        <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
          No timesheets are waiting for approval.
        </div>
      ) : (
        timesheets.map((timesheet) => (
          <TimesheetCard
            key={timesheet.id}
            timesheet={timesheet}
            entries={entriesByTimesheet[timesheet.id] ?? []}
            isOwner={timesheet.userId === userId}
            canApprove
            submittedBy={members.labels[timesheet.userId] ?? null}
            decidedBy={
              timesheet.decidedBy
                ? (members.labels[timesheet.decidedBy] ?? null)
                : null
            }
          />
        ))
      )}
    </div>
  )
}
