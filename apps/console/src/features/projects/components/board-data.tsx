import { AppError } from '@876/ui/app-error'

import { projects } from '@/lib/clients/projects'
import { IssueBoard } from '@876/projects-ui/issue-board'

export async function BoardData({
  organizationId,
  base,
}: {
  organizationId: string
  base: string
}) {
  const result = await projects.issues.list(organizationId)

  return (
    <div className="space-y-3">
      {result.error ? (
        <AppError
          title="Board issues could not be loaded"
          error={result.error}
          variant="banner"
          showCode
        />
      ) : null}
      <IssueBoard
        issues={result.data?.data ?? []}
        issuesHref={`${base}/issues`}
      />
    </div>
  )
}
