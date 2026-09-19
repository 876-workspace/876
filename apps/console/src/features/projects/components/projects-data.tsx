import { AppError } from '@876/ui/app-error'
import type { ProjectStatus } from '@876/projects/contracts'
import { ProjectsList } from '@876/projects-ui/project-list'

import { projects } from '@/lib/clients/projects'

/**
 * The data half of the Projects list, shared by 876's own `/projects` section
 * and by every organization workspace.
 */
export async function ProjectsData({
  organizationId,
  base,
  status,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  /** Already narrowed by the route's isProjectStatus guard. */
  status?: ProjectStatus
}) {
  const result = await projects.projects.list(organizationId, { status })

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {result.error ? (
        <AppError
          title="Some project data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <ProjectsList
        projects={result.data?.data ?? []}
        projectsHref={`${base}/projects`}
        newProjectHref={`${base}/projects/new`}
      />
    </div>
  )
}
