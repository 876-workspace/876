'use client'

import type { Comment } from '@876/projects/contracts'
import { IssueComments } from '@876/projects-ui/issue-comments'

import { ClientVisibleToggle } from '@/features/collaboration/components/client-visible-toggle'
import { commentsClient } from '@/lib/client'

export function IssueCommentsData({
  issueRef,
  comments,
  currentUserId,
  visibilityById,
  visibilityBasePath,
  canToggleClientVisibility,
}: {
  issueRef: string
  comments: readonly Comment[]
  currentUserId?: string | null
  visibilityById?: Readonly<Record<string, boolean>>
  visibilityBasePath?: string
  canToggleClientVisibility?: boolean
}) {
  const visibilityBase = (visibilityBasePath ?? '').replace(/\/+$/, '')
  const toggleable =
    canToggleClientVisibility === true &&
    visibilityBasePath !== undefined &&
    visibilityById !== undefined
      ? comments.filter(
          (comment) => visibilityById[comment.id] !== undefined
        )
      : []
  return (
    <div className="space-y-4">
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
      {toggleable.length > 0 ? (
        <section
          data-slot="comment-visibility-list"
          aria-label="Comment client visibility"
          className="space-y-2"
        >
          <h3 className="text-sm font-semibold">Client visibility</h3>
          <ul className="flex flex-col gap-2">
            {toggleable.map((comment) => (
              <li
                key={comment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3"
              >
                <span className="text-muted-foreground max-w-md truncate text-xs">
                  {comment.body.slice(0, 80)}
                </span>
                <ClientVisibleToggle
                  endpoint={`${visibilityBase}/${encodeURIComponent(comment.id)}/visibility`}
                  initialVisible={visibilityById?.[comment.id] ?? false}
                  label={`Comment ${comment.id}`}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
