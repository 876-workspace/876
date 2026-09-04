'use client'

import type { Comment } from '@876/projects/contracts'
import { IssueComments } from '@876/projects-ui/issue-comments'

import { commentsClient } from '@/lib/client'

export function IssueCommentsData({
  issueRef,
  comments,
  currentUserId,
}: {
  issueRef: string
  comments: readonly Comment[]
  currentUserId?: string | null
}) {
  return (
    <IssueComments
      comments={comments}
      currentUserId={currentUserId}
      onCreateComment={(body) => commentsClient.create({ issueRef, body })}
      onUpdateComment={(commentId, body) =>
        commentsClient.update(commentId, { issueRef, body })
      }
      onDeleteComment={(commentId) =>
        commentsClient.delete(commentId, issueRef)
      }
    />
  )
}
