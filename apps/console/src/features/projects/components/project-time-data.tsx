import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'

import { formatOperatorDuration } from './operator-format'
import { ReadOnlyTimeEntries } from './read-only-time-entries'
import { toOperatorTimeEntryRows } from './time-entries-data'

/**
 * The data half of the project Time tab, shared by every host: every entry
 * logged against the project, with totals. Read-only.
 */
export async function ProjectTimeData({
  organizationId,
  base,
  projectId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId: string
}) {
  const [projectResult, entriesResult, issuesResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.timeEntries.list(organizationId, { projectId }),
    projects.issues.list(organizationId, { project: projectId, limit: 100 }),
  ])

  if (projectResult.error?.code === 'projects/project-not-found') notFound()

  if (projectResult.error || !projectResult.data) {
    return (
      <AppError
        title="Project could not be loaded"
        error={projectResult.error}
        variant="banner"
        showCode
      />
    )
  }

  const loadError = entriesResult.error ?? issuesResult.error
  const entries = entriesResult.data?.data ?? []
  const projectNames = new Map([[projectResult.data.id, projectResult.data.name]])
  const issueTitles = new Map(
    (issuesResult.data?.data ?? []).map((issue) => [issue.id, issue.title])
  )
  const totalMinutes = entries.reduce(
    (total, entry) => total + (entry.durationMinutes ?? 0),
    0
  )
  const billableMinutes = entries
    .filter((entry) => entry.billable)
    .reduce((total, entry) => total + (entry.durationMinutes ?? 0), 0)

  return (
    <div className="space-y-3">
      {loadError ? (
        <AppError
          title="Some time data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <p className="text-muted-foreground text-sm">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·{' '}
        {formatOperatorDuration(totalMinutes)} total ·{' '}
        {formatOperatorDuration(billableMinutes)} billable
      </p>
      <ReadOnlyTimeEntries
        entries={toOperatorTimeEntryRows(entries, projectNames, issueTitles)}
        issuesBaseHref={`${base}/issues`}
        emptyTitle="No time has been logged against this project yet."
      />
    </div>
  )
}
