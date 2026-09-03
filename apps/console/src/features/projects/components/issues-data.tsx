import { AppError } from '@876/ui/app-error'

import type { IssueFilterStatus } from '../issue-status'
import { projects } from '@/lib/services/projects'
import { IssuesTable } from '@876/projects-ui/issue-list'

export async function IssuesData({
  organizationId,
  base,
  status,
}: {
  organizationId: string
  base: string
  status: IssueFilterStatus
}) {
  const result = await projects.issues.list(organizationId, {
    status: status === 'all' ? undefined : status,
  })

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Some issue data could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <IssuesTable
        issues={result.data?.data ?? []}
        issuesHref={`${base}/issues`}
        newIssueHref={`${base}/issues/new`}
      />
    </div>
  )
}
