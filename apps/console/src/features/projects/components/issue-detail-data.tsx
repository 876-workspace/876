import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { IssueDetail } from '@876/projects-ui/issue-detail'

export async function IssueDetailData({
  organizationId,
  base,
  issueRef,
}: {
  organizationId: string
  base: string
  issueRef: string
}) {
  const [issueResult, commentsResult, eventsResult] = await Promise.all([
    projects.issues.retrieve(organizationId, issueRef),
    projects.comments.list(organizationId, issueRef),
    projects.issues.events.list(organizationId, issueRef),
  ])

  if (issueResult.error?.code === 'projects/issue-not-found') notFound()

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
      issuesHref={`${base}/issues`}
      projectHref={`${base}/projects/${issueResult.data.projectId}`}
    />
  )
}
