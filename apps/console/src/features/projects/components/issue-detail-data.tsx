import type { Comment } from '@876/projects/contracts'
import { AppError } from '@876/ui/app-error'
import { Badge } from '@876/ui/badge'
import { Markdown } from '@876/ui/markdown'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { IssueDetail } from '@876/projects-ui/issue-detail'

import { AttachmentsData } from './attachments-data'
import { formatOperatorDuration } from './operator-format'
import { ReadOnlyTimeEntries } from './read-only-time-entries'
import { toOperatorTimeEntryRows } from './time-entries-data'

function formatCommentDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Console is an oversight surface, not where the owner writes comments (that
// workflow lives in the Projects app itself) — read-only thread, no composer.
function IssueCommentThread({ comments }: { comments: readonly Comment[] }) {
  if (comments.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">Comments</h2>
      <ul className="divide-border/60 divide-y rounded-lg border">
        {comments.map((comment) => (
          <li key={comment.id} className="space-y-1 p-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <span className="font-mono">{comment.authorUserId}</span>
              <span>{formatCommentDate(comment.createdAt)}</span>
            </div>
            <Markdown content={comment.body} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export async function IssueDetailData({
  organizationId,
  base,
  issueRef,
  actorUserId,
}: {
  organizationId: string
  base: string
  issueRef: string
  actorUserId: string | null
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

  const issue = issueResult.data
  const [relationsResult, dependenciesResult, timeResult] = await Promise.all([
    projects.issueRelations.list(organizationId, issueRef),
    projects.issueDependencies.list(organizationId, issueRef),
    projects.timeEntries.list(organizationId, { issueId: issue.id }),
  ])

  const enrichmentError =
    commentsResult.error ??
    eventsResult.error ??
    relationsResult.error ??
    dependenciesResult.error ??
    timeResult.error
  const relations = relationsResult.data?.data ?? []
  const predecessors = dependenciesResult.data?.predecessors ?? []
  const successors = dependenciesResult.data?.successors ?? []
  const timeEntries = timeResult.data?.data ?? []
  const loggedMinutes = timeEntries.reduce(
    (total, entry) => total + (entry.durationMinutes ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      {enrichmentError ? (
        <AppError
          title="Some issue details could not be loaded"
          error={enrichmentError}
          variant="banner"
          showCode
        />
      ) : null}
      <IssueDetail
        issue={issue}
        events={eventsResult.data?.data ?? []}
        projectHref={`${base}/projects/${issue.projectId}`}
      />
      <IssueCommentThread comments={commentsResult.data?.data ?? []} />
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          Relations ({relations.length})
        </h2>
        {relations.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This work item has no relations.
          </p>
        ) : (
          <ul className="divide-border/60 divide-y rounded-lg border">
            {relations.map((relation) => (
              <li
                key={relation.id}
                className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
              >
                <Badge variant="secondary">{relation.type}</Badge>
                <span className="font-mono text-xs">
                  {relation.sourceIssueId === issue.id
                    ? relation.targetIssueId
                    : relation.sourceIssueId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Dependencies</h2>
        {predecessors.length === 0 && successors.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This work item has no dependencies.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <h3 className="text-xs font-semibold">
                Blocked by ({predecessors.length})
              </h3>
              <ul className="mt-2 space-y-1">
                {predecessors.map((dependency) => (
                  <li
                    key={dependency.id}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <Badge variant="secondary">{dependency.type}</Badge>
                    <span className="font-mono text-xs">
                      {dependency.predecessorIssueId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border p-3">
              <h3 className="text-xs font-semibold">
                Blocking ({successors.length})
              </h3>
              <ul className="mt-2 space-y-1">
                {successors.map((dependency) => (
                  <li
                    key={dependency.id}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <Badge variant="secondary">{dependency.type}</Badge>
                    <span className="font-mono text-xs">
                      {dependency.successorIssueId}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          Time logged · {formatOperatorDuration(loggedMinutes)} across{' '}
          {timeEntries.length}{' '}
          {timeEntries.length === 1 ? 'entry' : 'entries'}
        </h2>
        {timeEntries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No time has been logged against this work item yet.
          </p>
        ) : (
          <ReadOnlyTimeEntries
            entries={toOperatorTimeEntryRows(
              timeEntries,
              new Map([[issue.projectId, issue.projectKey]]),
              new Map([[issue.id, issue.title]])
            )}
            issuesBaseHref={`${base}/issues`}
            emptyTitle="No time has been logged against this work item yet."
          />
        )}
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Attachments</h2>
        <AttachmentsData
          organizationId={organizationId}
          resourceType="issue"
          resourceId={issue.id}
          actorUserId={actorUserId}
        />
      </div>
    </div>
  )
}
