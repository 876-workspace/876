import { IssueBoard } from '@876/projects-ui/issue-board'
import { AppError } from '@876/ui/app-error'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export async function BoardData() {
  const { orgId } = await requireProjectsContext()
  // The board shows every open state at once, so it deliberately does not take
  // the status filter the list pages use.
  const result = await projects.issues.list(orgId, { limit: 100 })

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="The board could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <IssueBoard issues={result.data?.data ?? []} issuesHref="/issues" />
    </div>
  )
}
