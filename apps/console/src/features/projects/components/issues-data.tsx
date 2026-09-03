import { AppError } from '@876/ui/app-error'
import { IssuesList } from '@876/projects-ui/issue-list'

import { projects } from '@/lib/services/projects'

/**
 * The data half of the Issues list column, shared by every host. See
 * `ProjectsData` for why the status filter is applied in the list component
 * rather than in this call.
 */
export async function IssuesData({
  organizationId,
  base,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/orgs/acme/workspace/projects`. */
  base: string
}) {
  const result = await projects.issues.list(organizationId)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {result.error ? (
        <AppError
          title="Some issue data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <IssuesList
        issues={result.data?.data ?? []}
        issuesHref={`${base}/issues`}
        newIssueHref={`${base}/issues/new`}
      />
    </div>
  )
}
