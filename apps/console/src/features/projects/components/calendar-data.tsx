import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'

import { projects } from '@/lib/clients/projects'

import { formatOperatorDate } from './operator-format'

function kindBadge(kind: string) {
  if (kind === 'meeting') return <Badge variant="info">Meeting</Badge>
  if (kind === 'issue-due') return <Badge variant="secondary">Due</Badge>
  return <Badge variant="secondary">{kind}</Badge>
}

/**
 * The data half of the Calendar period view, shared by every host.
 * `@876/projects-ui` ships no calendar presentation, so the entries table is
 * Console-local markup.
 */
export async function CalendarData({
  organizationId,
  from,
  to,
  projectId,
}: {
  organizationId: string
  from: number
  to: number
  projectId?: string
}) {
  const [calendarResult, projectsResult] = await Promise.all([
    projects.calendar.retrieve(organizationId, {
      from,
      to,
      ...(projectId ? { projectId } : {}),
    }),
    projects.projects.list(organizationId, { limit: 100 }),
  ])

  const loadError = calendarResult.error ?? projectsResult.error
  const projectNames = new Map(
    (projectsResult.data?.data ?? []).map((project) => [
      project.id,
      project.name,
    ])
  )
  const entries = (calendarResult.data?.entries ?? []).toSorted(
    (left, right) => left.occurrenceStart - right.occurrenceStart
  )

  return (
    <div className="space-y-3">
      {loadError ? (
        <AppError
          title="Some calendar data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <p className="text-muted-foreground text-sm">
        {formatOperatorDate(from)} – {formatOperatorDate(to)} · {entries.length}{' '}
        {entries.length === 1 ? 'entry' : 'entries'}
      </p>
      {entries.length === 0 ? (
        <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
          Nothing scheduled in this period.
        </div>
      ) : (
        <div className="876-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Kind</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {entries.map((entry) => (
                  <tr key={`${entry.kind}-${entry.id}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDate(entry.occurrenceStart)}
                      {entry.allDay ? (
                        <span className="text-muted-foreground ml-2 text-xs">
                          All day
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{entry.title}</span>
                      {entry.issueIdentifier ? (
                        <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                          {entry.issueIdentifier}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{kindBadge(entry.kind)}</td>
                    <td className="px-4 py-3">
                      {projectNames.get(entry.projectId) ?? entry.projectId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
