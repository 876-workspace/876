import { AppError } from '@876/ui/app-error'
import Link from 'next/link'

import { formatDate } from '@876/projects-ui/format-date'
import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'
import type { CycleStatus } from '@/features/projects/cycle-filters'

const STATUS_LABEL: Record<CycleStatus, string> = {
  active: 'Active',
  upcoming: 'Upcoming',
  completed: 'Completed',
}

export async function CycleListData({
  project,
  status,
}: {
  project?: string
  status?: CycleStatus
}) {
  const { orgId } = await requireProjectsContext()
  const [projectList, cycles] = await Promise.all([
    projects.projects.list(orgId, { limit: 100 }),
    projects.cycles.list(orgId, {
      ...(project ? { projectId: project } : {}),
      ...(status ? { status } : {}),
    }),
  ])

  const loadError = cycles.error ?? projectList.error
  const projectNames = new Map(
    (projectList.data?.data ?? []).map((entry) => [entry.id, entry.name])
  )
  const rows = cycles.data?.data ?? []

  return (
    <div className="space-y-4">
      {loadError ? (
        <AppError
          title="Some cycle data could not be loaded"
          error={loadError}
          variant="banner"
        />
      ) : null}
      <div className="876-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-left">
              <th className="px-4 py-2 font-medium">Cycle</th>
              <th className="px-4 py-2 font-medium">Project</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Dates</th>
              <th className="px-4 py-2 font-medium">Progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((cycle) => (
              <tr key={cycle.id} className="border-t">
                <td className="px-4 py-2">
                  <Link
                    href={`/cycles/${encodeURIComponent(cycle.id)}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {cycle.name}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {cycle.projectId
                    ? (projectNames.get(cycle.projectId) ?? cycle.projectId)
                    : '—'}
                </td>
                <td className="px-4 py-2">
                  <span className="876-badge">
                    {STATUS_LABEL[cycle.status]}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {formatDate(cycle.startsAt)} → {formatDate(cycle.endsAt)}
                </td>
                <td className="px-4 py-2">
                  {cycle.progress.completed}/{cycle.progress.total}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr className="border-t">
                <td className="text-muted-foreground px-4 py-6" colSpan={5}>
                  No cycles found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
