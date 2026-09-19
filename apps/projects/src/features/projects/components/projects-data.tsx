import { ProjectsTable } from '@876/projects-ui/project-list'
import type { ProjectFilterStatus } from '@876/projects-ui/status-options'
import { AppError } from '@876/ui/app-error'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/clients/projects'

export async function ProjectsData({
  status,
}: {
  status: ProjectFilterStatus
}) {
  const { orgId } = await requireProjectsContext()
  const result = await projects.projects.list(orgId, {
    status: status === 'all' ? undefined : status,
  })

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some project data could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <ProjectsTable
        projects={result.data?.data ?? []}
        projectsHref="/projects"
        newProjectHref="/projects/new"
      />
    </div>
  )
}
