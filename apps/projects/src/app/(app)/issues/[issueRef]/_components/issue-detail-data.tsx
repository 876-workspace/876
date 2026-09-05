import { IssueDetail } from '@876/projects-ui/issue-detail'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { IssueCommentsData } from '@/features/projects/components/issue-comments-data'
import { projects } from '@/lib/services/projects'

export async function IssueDetailData({
  orgId,
  userId,
  issueRef,
}: {
  orgId: string
  userId: string
  issueRef: string
}) {
  const decodedIssueRef = decodeURIComponent(issueRef)
  const [issueResult, eventsResult] = await Promise.all([
    projects.issues.retrieve(orgId, decodedIssueRef),
    projects.issues.events.list(orgId, decodedIssueRef),
  ])

  if (!issueResult.data) notFound()

  return (
    <>
      <IssueDetail
        issue={issueResult.data}
        events={eventsResult.data?.data ?? []}
        projectHref={`/projects/${issueResult.data.projectId}`}
      />
      <div className="mt-6 lg:mr-[33.333333%]">
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">
              Loading comments…
            </div>
          }
        >
          <IssueCommentsData
            orgId={orgId}
            issueRef={issueResult.data.identifier}
            currentUserId={userId}
          />
        </Suspense>
      </div>
    </>
  )
}
