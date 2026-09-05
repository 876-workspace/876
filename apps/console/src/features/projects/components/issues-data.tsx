import { AppError } from '@876/ui/app-error'
import type { IssueStatus } from '@876/projects/contracts'
import { IssuesList } from '@876/projects-ui/issue-list'

import { projects } from '@/lib/services/projects'

/**
 * The data half of the Issues list, shared by every host.
 */
export async function IssuesData({
  organizationId,
  base,
  status,
}: {
  organizationId: string
  /** The host's Projects root, e.g. `/projects` or `/workspace/acme/projects`. */
  base: string
  /** Already narrowed by the route's isIssueStatus guard. */
  status?: IssueStatus
}) {
  const result = await projects.issues.list(organizationId, { status })

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
