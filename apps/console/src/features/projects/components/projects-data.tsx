import { AppError } from '@876/ui/app-error'

import type { ProjectFilterStatus } from '../project-status'
import { projects } from '@/lib/services/projects'
import { ProjectsTable } from '@876/projects-ui/project-list'

export async function ProjectsData({
  organizationId,
  base,
  status,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/orgs/acme/workspace/projects`. */
  base: string
  status: ProjectFilterStatus
}) {
  const result = await projects.projects.list(organizationId, {
    status: status === 'all' ? undefined : status,
  })

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some project data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <ProjectsTable
        projects={result.data?.data ?? []}
        projectsHref={`${base}/projects`}
        newProjectHref={`${base}/projects/new`}
      />
    </div>
  )
}
