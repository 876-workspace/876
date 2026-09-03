import { AppError } from '@876/ui/app-error'
import { ProjectsList } from '@876/projects-ui/project-list'

import { projects } from '@/lib/services/projects'

/**
 * The data half of the Projects list column, shared by 876's own `/projects`
 * section and by every organization workspace.
 *
 * The status filter is applied inside `ProjectsList` rather than threaded into
 * this call: the list lives in a layout so it survives opening a record, and a
 * layout receives no `searchParams` (`.claude/rules/app-layout.md` §5a).
 */
export async function ProjectsData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/orgs/acme/workspace/projects`. */
  base: string
}) {
  const result = await projects.projects.list(organizationId)

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
