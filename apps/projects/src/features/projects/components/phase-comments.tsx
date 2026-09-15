'use client'

import type { MilestoneComment } from '@876/projects/contracts'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import { Markdown } from '@876/ui/markdown'
import { MarkdownEditor } from '@876/ui/markdown-editor'
import { useState } from 'react'

import { phasesClient } from '@/lib/client'

function formatDate(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PhaseComments({
  phaseId,
  comments,
  currentUserId,
  userLabels,
  canEdit,
}: {
  phaseId: string
  comments: readonly MilestoneComment[]
  currentUserId: string
  userLabels: Readonly<Record<string, string>>
  canEdit: boolean
}) {
  const [items, setItems] = useState([...comments])
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  const [prevComments, setPrevComments] = useState(comments)
  if (prevComments !== comments) {
    setPrevComments(comments)
    setItems([...comments])
  }

  async function create() {
    const trimmed = body.trim()
    if (!trimmed || pending || !canEdit) return
    setPending(true)
    setError(null)
    const result = await phasesClient.comments.create(phaseId, trimmed)
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/comment-create-failed',
          message: 'Comment could not be added.',
        }
      )
      return
    }
    setItems((current) => [...current, result.data as MilestoneComment])
    setBody('')
  }

  async function save(commentId: string) {
    const trimmed = draft.trim()
    if (!trimmed || pending) return
    setPending(true)
    setError(null)
    const result = await phasesClient.comments.update(
      phaseId,
      commentId,
      trimmed
    )
    setPending(false)
    if (result.error || !result.data) {
      setError(
        result.error ?? {
          code: 'projects/comment-update-failed',
          message: 'Comment could not be updated.',
        }
      )
      return
    }
    setItems((current) =>
      current.map((comment) =>
        comment.id === commentId ? (result.data as MilestoneComment) : comment
      )
    )
    setEditingId(null)
    setDraft('')
  }

  async function remove(commentId: string) {
    if (pending) return
    setPending(true)
    setError(null)
    const result = await phasesClient.comments.delete(phaseId, commentId)
    setPending(false)
    if (result.error || !result.data?.deleted) {
      setError(
        result.error ?? {
          code: 'projects/comment-delete-failed',
          message: 'Comment could not be deleted.',
        }
      )
      return
    }
    setItems((current) => current.filter((comment) => comment.id !== commentId))
  }

  return (
    <section
      className="876-card space-y-5 p-5 sm:p-6"
      aria-label="Phase comments"
    >
      <h2 className="text-sm font-semibold">Comments ({items.length})</h2>
      {items.length === 0 ? (
        <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
          No comments yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((comment) => {
            const own = comment.authorUserId === currentUserId
            const editing = editingId === comment.id
            return (
              <article key={comment.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {comment.authorUserId
                      ? (userLabels[comment.authorUserId] ??
                        comment.authorUserId)
                      : 'Unknown'}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(comment.createdAt)}
                  </span>
                </div>
                {editing ? (
                  <div className="mt-3 space-y-3">
                    <MarkdownEditor
                      value={draft}
                      onValueChange={setDraft}
                      minRows={4}
                      disabled={pending}
                      id={`phase-comment-${comment.id}`}
                      name="body"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setEditingId(null)
                          setDraft('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="info"
                        size="sm"
                        disabled={pending || !draft.trim()}
                        onClick={() => save(comment.id)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Markdown content={comment.body} className="mt-2" />
                    {own && canEdit ? (
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => {
                            setEditingId(comment.id)
                            setDraft(comment.body)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={pending}
                          onClick={() => remove(comment.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}

      {error ? (
        <AppError
          title="Comment action failed"
          error={error}
          variant="banner"
        />
      ) : null}

      {canEdit ? (
        <div className="border-border/60 bg-muted/20 rounded-xl border p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Add a comment</h3>
            <span className="text-muted-foreground text-xs">
              Markdown supported
            </span>
          </div>
          <MarkdownEditor
            value={body}
            onValueChange={setBody}
            minRows={4}
            disabled={pending}
            placeholder="Add a phase comment…"
            id="phase-comment-body"
            name="body"
          />
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="info"
              disabled={pending || !body.trim()}
              onClick={create}
            >
              {pending ? 'Commenting…' : 'Comment'}
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
