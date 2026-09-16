import { AppError } from '@876/ui/app-error'
import { TimesheetSummary } from '@876/projects-ui/timesheet-summary'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

import { toOperatorTimeEntryRows } from './time-entries-data'
import { ReadOnlyTimeEntries } from './read-only-time-entries'

function toSummaryStatus(
  status: string
): 'draft' | 'submitted' | 'approved' | 'rejected' {
  if (status === 'submitted' || status === 'approved' || status === 'rejected')
    return status
  return 'draft'
}

/**
 * The data half of the Timesheet detail, shared by every host. The header
 * reuses the shared summary; the entries reuse the shared read-only table.
 */
export async function TimesheetDetailData({
  organizationId,
  base,
  timesheetId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  timesheetId: string
}) {
  const timesheetResult = await projects.timesheets.retrieve(
    organizationId,
    decodeURIComponent(timesheetId)
  )

  if (timesheetResult.error?.code === 'projects/timesheet-not-found')
    notFound()

  if (timesheetResult.error || !timesheetResult.data) {
    return (
      <AppError
        title="Timesheet could not be loaded"
        error={timesheetResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const timesheet = timesheetResult.data
  const [projectsResult, issuesResult] = await Promise.all([
    projects.projects.list(organizationId, { limit: 100 }),
    projects.issues.list(organizationId, { limit: 100 }),
  ])

  const loadError = projectsResult.error ?? issuesResult.error
  const projectNames = new Map(
    (projectsResult.data?.data ?? []).map((project) => [
      project.id,
      project.name,
    ])
  )
  const issueTitles = new Map(
    (issuesResult.data?.data ?? []).map((issue) => [issue.id, issue.title])
  )

  return (
    <div className="space-y-6">
      {loadError ? (
        <AppError
          title="Some timesheet details could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <TimesheetSummary
        periodStart={timesheet.periodStart}
        periodEnd={timesheet.periodEnd}
        status={toSummaryStatus(timesheet.status)}
        submittedAt={timesheet.submittedAt}
        submittedBy={timesheet.userId}
        decidedAt={timesheet.decidedAt}
        decidedBy={timesheet.decidedBy}
        entries={timesheet.entries.map((entry) => ({
          id: entry.id,
          startedAt: entry.startedAt,
          durationMinutes: entry.durationMinutes ?? 0,
          billable: entry.billable,
          projectId: entry.projectId,
          projectName:
            projectNames.get(entry.projectId) ?? entry.projectId,
        }))}
        groupBy="project"
      />
      <section className="space-y-3">
        <h2 className="text-[0.9375rem] font-semibold">
          Entries ({timesheet.entries.length})
        </h2>
        <ReadOnlyTimeEntries
          entries={toOperatorTimeEntryRows(
            timesheet.entries,
            projectNames,
            issueTitles
          )}
          issuesBaseHref={`${base}/issues`}
          emptyTitle="This timesheet has no entries."
        />
      </section>
    </div>
  )
}
