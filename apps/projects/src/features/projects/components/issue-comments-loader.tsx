import { AppError } from '@876/ui/app-error'

import { IssueCommentsData } from '@/features/projects/components/issue-comments-data'
import { projects } from '@/lib/services/projects'
import { listIssueCommentVisibility } from '@/lib/visibility'

/**
 * The server half of the comment thread. It sits inside the record's Suspense
 * boundary so the issue renders immediately and only the thread waits on I/O,
 * then hands the loaded comments to the client component that owns the editor.
 */
export async function IssueCommentsLoader({
  orgId,
  issueRef,
  currentUserId,
  canToggleClientVisibility,
}: {
  orgId: string
  issueRef: string
  currentUserId?: string | null
  canToggleClientVisibility?: boolean
}) {
  const result = await projects.comments.list(orgId, issueRef)

  if (result.error) {
    return (
      <AppError
        title="Comments could not be loaded"
        error={result.error}
        variant="banner"
      />
    )
  }

  if (canToggleClientVisibility !== true) {
    return (
      <IssueCommentsData
        issueRef={issueRef}
        comments={result.data?.data ?? []}
        currentUserId={currentUserId}
      />
    )
  }

  const visibilityById = await listIssueCommentVisibility(orgId, issueRef)
  return (
    <IssueCommentsData
      issueRef={issueRef}
      comments={result.data?.data ?? []}
      currentUserId={currentUserId}
      visibilityById={visibilityById}
      visibilityBasePath={`/api/issues/${encodeURIComponent(issueRef)}/comments`}
      canToggleClientVisibility
    />
  )
}
