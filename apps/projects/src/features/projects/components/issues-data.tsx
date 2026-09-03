import { IssuesTable } from '@876/projects-ui/issue-list'
import type { IssueFilterStatus } from '@876/projects-ui/status-options'
import { AppError } from '@876/ui/app-error'

import { requireProjectsContext } from '@/lib/auth/require-projects-context'
import { projects } from '@/lib/services/projects'

export async function IssuesData({ status }: { status: IssueFilterStatus }) {
  const { orgId } = await requireProjectsContext()
  const result = await projects.issues.list(orgId, {
    status: status === 'all' ? undefined : status,
  })

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some issue data could not be loaded"
          error={result.error}
          variant="banner"
        />
      ) : null}
      <IssuesTable
        issues={result.data?.data ?? []}
        issuesHref="/issues"
        newIssueHref="/issues/new"
      />
    </div>
  )
}
