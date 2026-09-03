import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { IssueBoard } from '@876/projects-ui/issue-board'

import { resolveOrg } from '../../../app/(app)/orgs/[slug]/_data'

export async function BoardData({ slug }: { slug: string }) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const result = await projects.issues.list(org.id)

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
        issuesHref={`/orgs/${slug}/workspace/projects/issues`}
      />
    </div>
  )
}
