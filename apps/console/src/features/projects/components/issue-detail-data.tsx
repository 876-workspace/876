import type { Comment } from '@876/projects/contracts'
import { AppError } from '@876/ui/app-error'
import { Markdown } from '@876/ui/markdown'
import { notFound } from 'next/navigation'

import { projects } from '@/lib/services/projects'
import { IssueDetail } from '@876/projects-ui/issue-detail'

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
    <div className="space-y-6">
      <IssueDetail
        issue={issueResult.data}
        events={eventsResult.data?.data ?? []}
        projectHref={`${base}/projects/${issueResult.data.projectId}`}
      />
      <IssueCommentThread comments={commentsResult.data?.data ?? []} />
    </div>
  )
}
