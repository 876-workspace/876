import {
  IssueDetailBody,
  IssueDetailHeader,
  IssueMetaRail,
} from '@876/projects-ui/issue-detail'
import { IssueAgentActions } from '@876/projects-ui/issue-agent-actions'
import { formatAgentBrief } from '@876/projects/agent-brief'
import { AppError } from '@876/ui/app-error'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { AttachmentsData } from '@/features/projects/components/attachments-data'
import { IssueCommentsLoader } from '@/features/projects/components/issue-comments-loader'
import { IssueLinksData } from '@/features/projects/components/issue-links-data'
import { IssueStatusSelect } from '@/features/projects/components/issue-status-select'
import { RemindersData } from '@/features/projects/components/reminders-data'
import { loadMemberLabels } from '@/features/projects/member-labels'
import { projects } from '@/lib/clients/projects'
import { getIssueVisibility } from '@/lib/visibility'

import { IssueVisibilityData } from './issue-visibility-data'

export async function IssueDetailData({
  orgId,
  userId,
  canEdit,
  canToggleVisibility,
  issueRef,
}: {
  orgId: string
  userId: string
  canEdit: boolean
  canToggleVisibility: boolean
  issueRef: string
}) {
  const decodedIssueRef = decodeURIComponent(issueRef)
  const issuePromise = projects.issues.retrieve(orgId, decodedIssueRef)
  const followPromise = projects.followers.list(orgId, {
    subjectType: 'work-item',
    subjectId: decodedIssueRef,
    limit: 100,
  })
  const eventsPromise = projects.issues.events.list(orgId, decodedIssueRef)
  const fieldsPromise = projects.customFields.list(orgId)
  const membersPromise = loadMemberLabels(orgId)
  const statesPromise = projects.workflowStates.list(orgId)
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

  const issue = issueResult.data
  const subIssuesPromise = projects.issues.list(orgId, {
    parent: issue.id,
    limit: 100,
  })
  const commentsPromise = projects.comments.list(orgId, issue.id, { limit: 100 })
  const parentPromise = issue.parentIssueId
    ? projects.issues.retrieve(orgId, issue.parentIssueId)
    : Promise.resolve({ data: null, error: null })
  const visibilityPromise = canToggleVisibility
    ? getIssueVisibility(orgId, decodedIssueRef)
    : Promise.resolve(null)
  const [
    eventsResult,
    fieldsResult,
    membersResult,
    subIssuesResult,
    parentResult,
    statesResult,
    followResult,
    visible,
    commentsResult,
  ] = await Promise.all([
    eventsPromise,
    fieldsPromise,
    membersPromise,
    subIssuesPromise,
    parentPromise,
    statesPromise,
    followPromise,
    visibilityPromise,
    commentsPromise,
  ])
  const following = followResult.data
    ? followResult.data.data.some((follower) => follower.userId === userId)
    : false
  const enrichmentError =
    eventsResult.error ??
    fieldsResult.error ??
    membersResult.error ??
    subIssuesResult.error ??
    parentResult.error ??
    statesResult.error ??
    commentsResult.error
  const detailProps = {
    issue,
    events: eventsResult.data?.data ?? [],
    parentIssue: parentResult.data,
    subIssues: subIssuesResult.data?.data ?? [],
    customFields: fieldsResult.data?.data ?? [],
    userLabels: membersResult.labels,
    issuesHref: '/issues',
    projectHref: `/projects/${issue.projectId}`,
  }
  const appOrigin =
    process.env.NEXT_PUBLIC_PROJECTS_URL?.trim() ||
    'https://876-projects.vercel.app'
  const agentBrief = formatAgentBrief({
    issue,
    comments: commentsResult.data?.data,
    parentIssue: parentResult.data,
    subIssues: subIssuesResult.data?.data,
    doneStatusKeys: statesResult.data?.data
      .filter((state) => state.category === 'completed')
      .map((state) => state.key),
    appOrigin,
  })

  return (
    <div className="space-y-6">
      <IssueDetailHeader
        issue={issue}
        editHref={`/issues/${issue.identifier}/edit`}
        actions={
          <>
            <IssueVisibilityData
              issueRef={issue.identifier}
              issueTitle={issue.title}
              canToggleVisibility={canToggleVisibility}
              following={following}
              visible={visible}
            />
            <IssueStatusSelect
              issueRef={issue.identifier}
              currentStatus={issue.status}
              statuses={(statesResult.data?.data ?? []).map((state) => ({
                key: state.key,
                label: state.name,
              }))}
              canEdit={canEdit}
            />
            <IssueAgentActions
              issueRef={issue.identifier}
              brief={agentBrief}
              issueUrl={`${appOrigin}/issues/${encodeURIComponent(issue.identifier)}`}
            />
          </>
        }
      />
      {enrichmentError ? (
        <AppError
          title="Some issue details could not be loaded"
          error={enrichmentError}
          variant="banner"
        />
      ) : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <IssueDetailBody {...detailProps} />
          <Suspense
            fallback={
              <div className="text-muted-foreground text-sm">
                Loading relationships and dependencies…
              </div>
            }
          >
            <IssueLinksData orgId={orgId} issueRef={issue.identifier} />
          </Suspense>
          <Suspense
            fallback={
              <div className="text-muted-foreground text-sm">
                Loading comments…
              </div>
            }
          >
            <IssueCommentsLoader
              orgId={orgId}
              issueRef={issue.identifier}
              currentUserId={userId}
              canToggleClientVisibility={canToggleVisibility}
            />
          </Suspense>
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
              projectId={issue.projectId}
              resourceType="issue"
              resourceId={issue.id}
              canEdit={canEdit}
            />
          </Suspense>
        </div>
        <aside className="space-y-6">
          <IssueMetaRail {...detailProps} />
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
              target={{ issueId: issue.id }}
            />
          </Suspense>
        </aside>
      </div>
    </div>
  )
}
