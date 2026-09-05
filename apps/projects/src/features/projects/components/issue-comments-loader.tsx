import { AppError } from '@876/ui/app-error'

import { IssueCommentsData } from '@/features/projects/components/issue-comments-data'
import { projects } from '@/lib/services/projects'

/**
 * The server half of the comment thread. It sits inside the record's Suspense
 * boundary so the issue renders immediately and only the thread waits on I/O,
 * then hands the loaded comments to the client component that owns the editor.
 */
export async function IssueCommentsLoader({
  orgId,
  issueRef,
  currentUserId,
}: {
  orgId: string
  issueRef: string
  currentUserId?: string | null
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

  return (
    <IssueCommentsData
      issueRef={issueRef}
      comments={result.data?.data ?? []}
      currentUserId={currentUserId}
    />
  )
}
