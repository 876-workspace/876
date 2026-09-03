import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { IssueDetail } from '@876/projects-ui/issue-detail'

import { resolveOrg } from '../../../app/(app)/orgs/[slug]/_data'

export async function IssueDetailData({
  slug,
  issueRef,
}: {
  slug: string
  issueRef: string
}) {
  const org = await resolveOrg(slug)
  if (!org) notFound()

  const [issueResult, commentsResult, eventsResult] = await Promise.all([
    projects.issues.retrieve(org.id, issueRef),
    projects.comments.list(org.id, issueRef),
    projects.issues.events.list(org.id, issueRef),
  ])

  if (issueResult.error?.code === 'projects/issue-not-found') {
    notFound()
  }

  if (issueResult.error || !issueResult.data) {
    return (
      <AppError
        title="Issue could not be loaded"
        error={issueResult.error}
        variant="banner"
        showCode
      />
    )
  }

  return (
    <IssueDetail
      issue={issueResult.data}
      comments={commentsResult.data?.data ?? []}
      events={eventsResult.data?.data ?? []}
      issuesHref={`/orgs/${slug}/workspace/projects/issues`}
      projectHref={`/orgs/${slug}/workspace/projects/projects/${issueResult.data.projectId}`}
    />
  )
}
