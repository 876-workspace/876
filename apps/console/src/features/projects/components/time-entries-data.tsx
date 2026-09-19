import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import type {
  TimeApprovalStatus,
  TimeEntry,
} from '@876/projects/contracts'
import type { TimeEntryListRow } from '@876/projects-ui/time-entry-list'

import { projects } from '@/lib/clients/projects'

import { formatOperatorDuration } from './operator-format'
import { ReadOnlyTimeEntries } from './read-only-time-entries'

function toApprovalStatus(value: string): TimeEntryListRow['approvalStatus'] {
  if (value === 'submitted' || value === 'approved' || value === 'rejected')
    return value
  return 'draft'
}

export function toOperatorTimeEntryRows(
  entries: readonly TimeEntry[],
  projectNames: ReadonlyMap<string, string>,
  issueTitles: ReadonlyMap<string, string>
): TimeEntryListRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    startedAt: entry.startedAt,
    durationMinutes: entry.durationMinutes ?? 0,
    billable: entry.billable,
    note: entry.note,
    approvalStatus: toApprovalStatus(entry.approvalStatus),
    projectName: projectNames.get(entry.projectId) ?? entry.projectId,
    issue: entry.issueId
      ? {
          id: entry.issueId,
          title: issueTitles.get(entry.issueId) ?? entry.issueId,
        }
      : null,
  }))
}

/**
 * The data half of the Time entries list, shared by every host. Status is
 * filtered by the toolbar; project and billable narrow through the link rows
 * below it so no client filter state is needed.
 */
export async function TimeEntriesData({
  organizationId,
  base,
  projectId,
  approvalStatus,
  billable,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId?: string
  approvalStatus?: TimeApprovalStatus
  billable?: boolean
}) {
  const [entriesResult, projectsResult, issuesResult] = await Promise.all([
    projects.timeEntries.list(organizationId, {
      ...(projectId ? { projectId } : {}),
      ...(approvalStatus ? { approvalStatus } : {}),
      ...(billable === undefined ? {} : { billable }),
    }),
    projects.projects.list(organizationId, { limit: 100 }),
    projects.issues.list(organizationId, { limit: 100 }),
  ])

  const loadError =
    entriesResult.error ?? projectsResult.error ?? issuesResult.error
  const entries = entriesResult.data?.data ?? []
  const projectNames = new Map(
    (projectsResult.data?.data ?? []).map((project) => [
      project.id,
      project.name,
    ])
  )
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

  const listHref = `${base}/time`
  function hrefFor(next: { project?: string; billable?: string }): string {
    const params = new URLSearchParams()
    if (approvalStatus) params.set('status', approvalStatus)
    const project = next.project ?? projectId
    if (project) params.set('project', project)
    const billableParam =
      next.billable ??
      (billable === undefined ? undefined : String(billable))
    if (billableParam) params.set('billable', billableParam)
    const query = params.toString()
    return query ? `${listHref}?${query}` : listHref
  }

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
      <div className="876-card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Project:</span>
        <Link
          href={hrefFor({ project: '' })}
          className={
            projectId
              ? 'text-876-accent-fg hover:underline'
              : 'font-medium'
          }
        >
          All
        </Link>
        {(projectsResult.data?.data ?? []).map((project) => (
          <Link
            key={project.id}
            href={hrefFor({ project: project.id })}
            className={
              projectId === project.id
                ? 'font-medium'
                : 'text-876-accent-fg hover:underline'
            }
          >
            {project.name}
          </Link>
        ))}
        <span className="text-muted-foreground ml-2">Billing:</span>
        <Link
          href={hrefFor({ billable: '' })}
          className={
            billable === undefined
              ? 'font-medium'
              : 'text-876-accent-fg hover:underline'
          }
        >
          All
        </Link>
        <Link
          href={hrefFor({ billable: 'true' })}
          className={
            billable === true
              ? 'font-medium'
              : 'text-876-accent-fg hover:underline'
          }
        >
          Billable
        </Link>
        <Link
          href={hrefFor({ billable: 'false' })}
          className={
            billable === false
              ? 'font-medium'
              : 'text-876-accent-fg hover:underline'
          }
        >
          Non-billable
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">
        {entries.length} {entries.length === 1 ? 'entry' : 'entries'} ·{' '}
        {formatOperatorDuration(totalMinutes)} total ·{' '}
        {formatOperatorDuration(billableMinutes)} billable ·{' '}
        <Link
          href={`${base}/time/timesheets`}
          className="text-876-accent-fg font-medium hover:underline"
        >
          Timesheets
        </Link>
      </p>
      <ReadOnlyTimeEntries
        entries={toOperatorTimeEntryRows(entries, projectNames, issueTitles)}
        issuesBaseHref={`${base}/issues`}
        emptyTitle="No time entries match these filters."
      />
    </div>
  )
}
