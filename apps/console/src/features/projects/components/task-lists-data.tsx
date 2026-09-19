import Link from 'next/link'

import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/clients/projects'

import { formatOperatorDateOrDash } from './operator-format'

/**
 * The data half of the Task lists list, shared by every host. Task lists
 * belong to one project, so without a `project` selection this renders the
 * project picker; `@876/projects-ui` ships no task-list presentation, so both
 * states are Console-local markup.
 */
export async function TaskListsData({
  organizationId,
  base,
  projectId,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  projectId?: string
}) {
  if (!projectId) {
    const projectsResult = await projects.projects.list(organizationId, {
      limit: 100,
    })

    return (
      <div className="space-y-3">
        {projectsResult.error ? (
          <AppError
            title="Project data could not be loaded"
            error={projectsResult.error}
            variant="banner"
            showCode
          />
        ) : null}
        <div className="876-card p-5">
          <h2 className="text-[0.9375rem] font-semibold">Select a project</h2>
          <ul className="mt-4 space-y-1">
            {(projectsResult.data?.data ?? []).map((project) => (
              <li key={project.id}>
                <Link
                  href={`${base}/task-lists?project=${encodeURIComponent(project.id)}`}
                  className="text-876-accent-fg text-sm font-medium hover:underline"
                >
                  {project.name}
                </Link>{' '}
                <span className="text-muted-foreground font-mono text-xs">
                  {project.key}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const [projectResult, taskListsResult, phasesResult] = await Promise.all([
    projects.projects.retrieve(organizationId, projectId),
    projects.taskLists.list(organizationId, projectId),
    projects.milestones.list(organizationId, projectId),
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

  const loadError = taskListsResult.error ?? phasesResult.error
  const phaseNames = new Map(
    (phasesResult.data?.data ?? []).map((phase) => [phase.id, phase.name])
  )
  const taskLists = taskListsResult.data?.data ?? []

  return (
    <div className="space-y-3">
      {loadError ? (
        <AppError
          title="Some task-list data could not be loaded"
          error={loadError}
          variant="banner"
          showCode
        />
      ) : null}
      <p className="text-muted-foreground text-sm">
        {projectResult.data.name} ·{' '}
        <Link
          href={`${base}/task-lists`}
          className="text-876-accent-fg font-medium hover:underline"
        >
          Change project
        </Link>
      </p>
      {taskLists.length === 0 ? (
        <div className="876-card text-muted-foreground px-5 py-10 text-center text-sm">
          No task lists yet.
        </div>
      ) : (
        <div className="876-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Task list</th>
                  <th className="px-4 py-3 font-medium">Phase</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {taskLists.map((taskList) => (
                  <tr key={taskList.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{taskList.name}</span>
                      {taskList.description ? (
                        <div className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                          {taskList.description}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      {taskList.milestoneId
                        ? (phaseNames.get(taskList.milestoneId) ??
                          taskList.milestoneId)
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {taskList.ownerUserId ?? 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {taskList.progress.completed}/{taskList.progress.total}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatOperatorDateOrDash(taskList.targetDate)}
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
