import { IssueDetail } from '@876/projects-ui/issue-detail'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AttachmentsData } from '@/features/projects/components/attachments-data'
import { IssueCommentsLoader } from '@/features/projects/components/issue-comments-loader'
import { IssueLinksData } from '@/features/projects/components/issue-links-data'
import { RemindersData } from '@/features/projects/components/reminders-data'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/services/projects'

export async function IssueDetailData({
  orgId,
  userId,
  canEdit,
  issueRef,
}: {
  orgId: string
  userId: string
  canEdit: boolean
  issueRef: string
}) {
  const decodedIssueRef = decodeURIComponent(issueRef)
  const issuePromise = projects.issues.retrieve(orgId, decodedIssueRef)
  const eventsPromise = projects.issues.events.list(orgId, decodedIssueRef)
  const fieldsPromise = projects.customFields.list(orgId)
  const membersPromise = loadMemberLabels(orgId)

  const issueResult = await issuePromise
  if (issueResult.error?.code === 'projects/issue-not-found') notFound()
  if (issueResult.error || !issueResult.data)
    return (
      <AppError
        title="The issue could not be loaded"
        error={
          issueResult.error ?? {
            code: 'projects/issue-unavailable',
            message: 'The issue could not be loaded.',
          }
        }
        variant="banner"
      />
    )

  const subIssuesPromise = projects.issues.list(orgId, {
    parent: issueResult.data.id,
    limit: 100,
  })
  const parentPromise = issueResult.data.parentIssueId
    ? projects.issues.retrieve(orgId, issueResult.data.parentIssueId)
    : Promise.resolve({ data: null, error: null })
  const [
    eventsResult,
    fieldsResult,
    membersResult,
    subIssuesResult,
    parentResult,
  ] = await Promise.all([
    eventsPromise,
    fieldsPromise,
    membersPromise,
    subIssuesPromise,
    parentPromise,
  ])
  const enrichmentError =
    eventsResult.error ??
    fieldsResult.error ??
    membersResult.error ??
    subIssuesResult.error ??
    parentResult.error

  return (
    <>
      <div className="space-y-4">
        {enrichmentError ? (
          <AppError
            title="Some issue details could not be loaded"
            error={enrichmentError}
            variant="banner"
          />
        ) : null}
        <IssueDetail
          issue={issueResult.data}
          events={eventsResult.data?.data ?? []}
          parentIssue={parentResult.data}
          subIssues={subIssuesResult.data?.data ?? []}
          customFields={fieldsResult.data?.data ?? []}
          userLabels={membersResult.labels}
          issuesHref="/issues"
          projectHref={`/projects/${issueResult.data.projectId}`}
          editHref={`/issues/${issueResult.data.identifier}/edit`}
        />
      </div>
      <div className="mt-6 lg:mr-[33.333333%]">
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">
              Loading relationships and dependencies…
            </div>
          }
        >
          <IssueLinksData
            orgId={orgId}
            issueRef={issueResult.data.identifier}
          />
        </Suspense>
      </div>
      <div className="mt-6 lg:mr-[33.333333%]">
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">
              Loading comments…
            </div>
          }
        >
          <IssueCommentsLoader
            orgId={orgId}
            issueRef={issueResult.data.identifier}
            currentUserId={userId}
          />
        </Suspense>
      </div>
      <div className="mt-6 lg:mr-[33.333333%]">
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">
              Loading reminders…
            </div>
          }
        >
          <RemindersData
            orgId={orgId}
            userId={userId}
            target={{ issueId: issueResult.data.id }}
          />
        </Suspense>
      </div>
      <div className="mt-6 lg:mr-[33.333333%]">
        <Suspense
          fallback={
            <div className="text-muted-foreground text-sm">
              Loading attachments…
            </div>
          }
        >
          <AttachmentsData
            orgId={orgId}
            userId={userId}
            projectId={issueResult.data.projectId}
            resourceType="issue"
            resourceId={issueResult.data.id}
            canEdit={canEdit}
          />
        </Suspense>
      </div>
    </>
  )
}
