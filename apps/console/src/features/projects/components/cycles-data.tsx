import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'

import type { CycleStatus } from '../cycle-status'
import { projects } from '@/lib/services/projects'

import { formatOperatorDateOrDash } from './operator-format'

function statusBadge(status: CycleStatus) {
  if (status === 'active') return <Badge variant="success">Active</Badge>
  if (status === 'completed') return <Badge variant="secondary">Completed</Badge>
  return <Badge variant="info">Upcoming</Badge>
}

/**
 * The data half of the Cycles list, shared by every host. `@876/projects-ui`
 * ships no cycle presentation, so this table is Console-local markup.
 */
export async function CyclesData({
  organizationId,
  base,
  projectId,
  status,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId?: string
  /** Already narrowed by the route's isCycleStatus guard. */
  status?: CycleStatus
}) {
  const [cyclesResult, projectsResult] = await Promise.all([
    projects.cycles.list(organizationId, {
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
    }),
    projects.projects.list(organizationId, { limit: 100 }),
  ])

  const loadError = cyclesResult.error ?? projectsResult.error
  const projectNames = new Map(
    (projectsResult.data?.data ?? []).map((project) => [
      project.id,
      project.name,
    ])
  )
  const cycles = cyclesResult.data?.data ?? []

  return (
    <div className="space-y-3">
      {loadError ? (
        <AppError
          title="Some cycle data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      {cycles.length === 0 ? (
        <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
          No cycles yet.
        </div>
      ) : (
        <div className="876-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Cycle</th>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {cycles.map((cycle) => (
                  <tr key={cycle.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`${base}/cycles/${encodeURIComponent(cycle.id)}`}
                        className="font-medium hover:underline"
                      >
                        {cycle.name}
                      </Link>
                      <div className="text-muted-foreground mt-0.5 text-xs">
                        Cycle {cycle.number}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cycle.projectId
                        ? (projectNames.get(cycle.projectId) ?? cycle.projectId)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(cycle.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDateOrDash(cycle.startsAt)} –{' '}
                      {formatOperatorDateOrDash(cycle.endsAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {cycle.progress.completed}/{cycle.progress.total}
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
