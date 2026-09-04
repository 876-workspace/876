'use client'

import type { Comment } from '@876/projects/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@876/ui/alert-dialog'
import { AppError, type AppErrorValue } from '@876/ui/app-error'
import { Button } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { MoreHorizontalIcon, Pencil, Trash } from '@876/ui/icons'
import { Markdown } from '@876/ui/markdown'
import { MarkdownEditor } from '@876/ui/markdown-editor'
import { useEffect, useState } from 'react'

type CommentResult = {
  data: Comment | null
  error: { code: string; message: string } | null
}

type DeleteResult = {
  data: { object: string; id: string; deleted: true } | null
  error: { code: string; message: string } | null
}

export type IssueCommentsProps = {
  comments: readonly Comment[]
  currentUserId?: string | null
  onCreateComment: (body: string) => Promise<CommentResult>
  onUpdateComment?: (commentId: string, body: string) => Promise<CommentResult>
  onDeleteComment?: (commentId: string) => Promise<DeleteResult>
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function IssueComments({
  comments,
  currentUserId,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
}: IssueCommentsProps) {
  const [items, setItems] = useState([...comments])
  const [body, setBody] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)

  useEffect(() => {
    setItems([...comments])
  }, [comments])

  async function submit() {
    const trimmed = body.trim()
    if (!trimmed || pending) return

    setPending(true)
    setError(null)
    const result = await onCreateComment(trimmed)
    setPending(false)

    if (!result.data || result.error) {
      setError({
        code: result.error?.code ?? 'projects/comment-create-failed',
        message: result.error?.message ?? 'Comment could not be added.',
      })
      return
    }

    setItems((current) => [...current, result.data as Comment])
    setBody('')
  }

  function replaceComment(comment: Comment) {
    setItems((current) =>
      current.map((c) => (c.id === comment.id ? comment : c))
    )
  }

  function removeComment(commentId: string) {
    setItems((current) => current.filter((c) => c.id !== commentId))
  }

  return (
    <section className="space-y-4" aria-label="Comments">
      <h2 className="text-sm font-semibold">Comments ({items.length})</h2>
      {items.length === 0 ? (
        <div className="border-border/60 text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
          No comments yet
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              canModify={
                currentUserId != null && comment.authorUserId === currentUserId
              }
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              onUpdated={replaceComment}
              onDeleted={removeComment}
            />
          ))}
        </div>
      )}
      {error ? (
        <AppError title="Comment not added" error={error} variant="banner" />
      ) : null}
      <div className="space-y-2">
        <MarkdownEditor
          value={body}
          onValueChange={setBody}
          placeholder="Add a comment in Markdown…"
          disabled={pending}
          id="comment-body"
          name="body"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="info"
            onClick={submit}
            disabled={!body.trim() || pending}
          >
            {pending ? 'Commenting…' : 'Comment'}
          </Button>
        </div>
      </div>
    </section>
  )
}

function CommentItem({
  comment,
  canModify,
  onUpdateComment,
  onDeleteComment,
  onUpdated,
  onDeleted,
}: {
  comment: Comment
  canModify: boolean
  onUpdateComment?: (commentId: string, body: string) => Promise<CommentResult>
  onDeleteComment?: (commentId: string) => Promise<DeleteResult>
  onUpdated: (comment: Comment) => void
  onDeleted: (commentId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<AppErrorValue | null>(null)
  const [deleteError, setDeleteError] = useState<AppErrorValue | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const canEdit = canModify && Boolean(onUpdateComment)
  const canDelete = canModify && Boolean(onDeleteComment)

  async function saveEdit() {
    const trimmed = draft.trim()
    if (!trimmed || pending || !onUpdateComment) return

    setPending(true)
    setError(null)
    const result = await onUpdateComment(comment.id, trimmed)
    setPending(false)

    if (!result.data || result.error) {
      setError({
        code: result.error?.code ?? 'projects/comment-update-failed',
        message: result.error?.message ?? 'Comment could not be updated.',
      })
      return
    }

    onUpdated(result.data)
    setEditing(false)
  }

  async function confirmDelete() {
    if (pending || !onDeleteComment) return
    setPending(true)
    setDeleteError(null)
    const result = await onDeleteComment(comment.id)
    setPending(false)
    if (!result.data?.deleted || result.error) {
      setDeleteError({
        code: result.error?.code ?? 'projects/comment-delete-failed',
        message: result.error?.message ?? 'Comment could not be deleted.',
      })
      return
    }
    setConfirmingDelete(false)
    onDeleted(comment.id)
  }

  return (
    <article className="876-card p-4">
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="font-mono">{comment.authorUserId ?? 'Unknown'}</span>
        <div className="flex items-center gap-2">
          <span>{formatDate(comment.createdAt)}</span>
          {(canEdit || canDelete) && !editing ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Comment actions"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-6 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-hidden"
              >
                <MoreHorizontalIcon aria-hidden="true" className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                {canEdit ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setDraft(comment.body)
                      setEditing(true)
                    }}
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    Edit
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDeleteError(null)
                      setConfirmingDelete(true)
                    }}
                  >
                    <Trash aria-hidden="true" className="size-4" />
                    Delete
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {canDelete ? (
            <AlertDialog
              open={confirmingDelete}
              onOpenChange={(open) => {
                setConfirmingDelete(open)
                if (!open) setDeleteError(null)
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete comment</AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteError ? (
                  <AppError
                    title="Comment not deleted"
                    error={deleteError}
                    variant="banner"
                  />
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {pending ? 'Deleting…' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <MarkdownEditor
            value={draft}
            onValueChange={setDraft}
            disabled={pending}
            id={`comment-edit-${comment.id}`}
            name="body"
          />
          {error ? (
            <AppError
              title="Comment not updated"
              error={error}
              variant="banner"
            />
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="info"
              onClick={saveEdit}
              disabled={!draft.trim() || pending}
            >
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        <Markdown content={comment.body} className="mt-2" />
      )}
    </article>
  )
}
