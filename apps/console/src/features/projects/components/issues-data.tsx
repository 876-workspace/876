import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import type { IssueFilterStatus } from '../issue-status'
import { projects } from '@/lib/services/projects'
import { IssuesTable } from '@876/projects-ui/issue-list'

import { resolveOrg } from '../../../app/(app)/orgs/[slug]/_data'

export async function IssuesData({
  slug,
  status,
}: {
  slug: string
  status: IssueFilterStatus
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await projects.issues.list(org.id, {
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
        issuesHref={`/orgs/${slug}/workspace/projects/issues`}
        newIssueHref={`/orgs/${slug}/workspace/projects/issues/new`}
      />
    </div>
  )
}
