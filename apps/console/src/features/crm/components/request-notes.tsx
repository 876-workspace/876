'use client'

import { editorContentEqual, isEditorContentEmpty } from '@876/editor'
import { Editor, EditorContent, type EditorHandle } from '@876/editor/react'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import {
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  Pencil,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from '@876/ui/icons'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { CrmRequestNote, NoteAuthor } from '../types'

export type { NoteAuthor }

/** `busyId` sentinel for the composer, which has no note id of its own. */
const COMPOSER = 'composer'

/** Lets the header's "Add → Note" action jump straight to the composer. */
export const NEW_NOTE_FIELD_ID = 'new-request-note'

function formatNoteDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const currentYear = new Date().getFullYear()

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() === currentYear ? {} : { year: 'numeric' }),
  }).format(date)
}

/**
 * The request conversation.
 *
 * A request has no description of its own: its opening message is the first
 * note (`kind: 'DESCRIPTION'`), and everything after it is an ordinary note.
 * The thread therefore reads bottom-up like a ticket — the description sits at
 * the bottom where it was written, later notes stack above it newest-first, and
 * the composer sits below everything so adding a note does not push the thread
 * down.
 */
export function RequestNotesSection({
  organizationId,
  requestId,
  notes,
  currentUserId,
  authors = {},
}: {
  organizationId: string
  requestId: string
  notes: CrmRequestNote[]
  currentUserId?: string
  authors?: Record<string, NoteAuthor>
}) {
  const router = useRouter()
  const composerRef = useRef<EditorHandle>(null)
  const [body, setBody] = useState('')
  const [composerKey, setComposerKey] = useState(0)
  const [isInternal, setIsInternal] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const { description, thread } = useMemo(() => {
    const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt)
    return {
      description: sorted.find((note) => note.kind === 'DESCRIPTION') ?? null,
      thread: sorted.filter((note) => note.kind !== 'DESCRIPTION'),
    }
  }, [notes])

  const isSubmitting = busyId === COMPOSER || isPending

  async function addNote(event: React.FormEvent) {
    event.preventDefault()
    if (isSubmitting) return

    setBusyId(COMPOSER)
    const nextBody = (await composerRef.current?.flush()) ?? body
    if (isEditorContentEmpty(nextBody)) {
      setBusyId(null)
      return
    }

    const result = await client.requestNotes.create(organizationId, requestId, {
      body: nextBody,
      internal: isInternal,
      authorId: currentUserId ?? '',
    })
    setBusyId(null)
    if (result.error) {
      toast.error(result.error.message ?? 'Failed to add note.')
      return
    }

    setBody('')
    setComposerKey((current) => current + 1)
    startTransition(() => router.refresh())
  }

  async function saveEdit(noteId: string, nextBody: string) {
    if (isEditorContentEmpty(nextBody)) {
      toast.error('A note cannot be empty.')
      return
    }

    setBusyId(noteId)
    const result = await client.requestNotes.update(
      organizationId,
      requestId,
      noteId,
      {
        body: nextBody,
        editedBy: currentUserId ?? '',
      }
    )
    setBusyId(null)
    if (result.error) {
      toast.error(result.error.message ?? 'Failed to save note.')
      return
    }

    setEditingId(null)
    startTransition(() => router.refresh())
  }

  async function deleteNote(noteId: string) {
    setBusyId(noteId)
    const result = await client.requestNotes.delete(
      organizationId,
      requestId,
      noteId,
      {
        deletedBy: currentUserId ?? '',
      }
    )
    setBusyId(null)
    if (result.error) {
      toast.error(result.error.message ?? 'Failed to delete note.')
      return
    }

    startTransition(() => router.refresh())
  }

  const empty = !description && thread.length === 0

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ChatBubbleLeftIcon
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
          <h2 className="876-section-title">Conversation</h2>
          <Badge variant="secondary" className="px-1.5 tabular-nums">
            {thread.length + (description ? 1 : 0)}
          </Badge>
        </div>
      </div>

      <ol className="border-border relative ml-4 flex flex-col gap-4 border-l pl-8">
        {thread.map((note) => (
          <TimelineEntry
            key={note.id}
            node={<AuthorNode author={resolveAuthor(note.authorId, authors)} />}
          >
            <NoteCard
              note={note}
              authorName={resolveAuthor(note.authorId, authors).name}
              currentUserId={currentUserId}
              busy={busyId === note.id || isPending}
              editing={editingId === note.id}
              onEdit={() => setEditingId(note.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(next) => saveEdit(note.id, next)}
              onDelete={() => deleteNote(note.id)}
            />
          </TimelineEntry>
        ))}

        {description ? (
          <TimelineEntry
            node={
              <AuthorNode
                author={resolveAuthor(description.authorId, authors)}
              />
            }
          >
            <NoteCard
              note={description}
              authorName={resolveAuthor(description.authorId, authors).name}
              currentUserId={currentUserId}
              busy={busyId === description.id || isPending}
              editing={editingId === description.id}
              onEdit={() => setEditingId(description.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(next) => saveEdit(description.id, next)}
            />
          </TimelineEntry>
        ) : null}

        {empty ? (
          <TimelineEntry node={<AuthorNode subdued />}>
            <p className="border-border/60 bg-muted/20 text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm">
              Nothing has been logged on this request yet.
            </p>
          </TimelineEntry>
        ) : null}

        <TimelineEntry
          node={
            <AuthorNode
              author={currentUserId ? authors[currentUserId] : undefined}
            />
          }
        >
          <form onSubmit={addNote} className="876-card flex flex-col gap-3 p-4">
            <Editor
              key={composerKey}
              ref={composerRef}
              id={NEW_NOTE_FIELD_ID}
              initialValue={body}
              onChange={setBody}
              placeholder="Add a note or progress update…"
              ariaLabel="New note"
              disabled={isSubmitting}
              minHeight={100}
              className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 rounded-md border px-3 py-2 shadow-xs focus-within:ring-[3px]"
              holderClassName="min-h-24"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 text-sm select-none">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(event) => setIsInternal(event.target.checked)}
                  className="border-input text-primary focus:ring-ring size-4 rounded focus:ring-offset-0"
                  disabled={isSubmitting}
                />
                <span>Internal note (team only)</span>
              </label>

              <Button
                type="submit"
                variant="info"
                size="sm"
                disabled={isSubmitting || isEditorContentEmpty(body)}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <ArrowPathIcon
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                )}
                {isSubmitting ? 'Adding' : 'Add note'}
              </Button>
            </div>
          </form>
        </TimelineEntry>
      </ol>
    </section>
  )
}

function TimelineEntry({
  node,
  children,
}: {
  node: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li className="relative">
      <div className="ring-background bg-background absolute top-3 -left-12 rounded-full ring-4">
        {node}
      </div>
      {children}
    </li>
  )
}

function resolveAuthor(
  authorId: string,
  authors: Record<string, NoteAuthor>
): NoteAuthor {
  return authors[authorId] ?? { name: authorId }
}

function AuthorNode({
  author,
  subdued = false,
}: {
  author?: NoteAuthor
  subdued?: boolean
}) {
  if (subdued || !author) {
    return (
      <span
        className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-full"
        aria-hidden="true"
      >
        <UserIcon className="size-4" />
      </span>
    )
  }

  return (
    <CustomerAvatar
      name={author.name}
      src={author.avatar}
      className="size-8 rounded-full text-[0.6875rem] after:rounded-full [&_[data-slot=avatar-fallback]]:rounded-full [&_[data-slot=avatar-fallback]]:text-[0.6875rem] [&_[data-slot=avatar-fallback]]:font-semibold [&_[data-slot=avatar-image]]:rounded-full"
    />
  )
}

function NoteCard({
  note,
  authorName: author,
  currentUserId,
  busy,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  note: CrmRequestNote
  authorName: string
  currentUserId?: string
  busy: boolean
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (body: string) => void
  onDelete?: () => void
}) {
  const editorRef = useRef<EditorHandle>(null)
  const [draft, setDraft] = useState(note.body)
  const isDescription = note.kind === 'DESCRIPTION'
  const isAuthor = Boolean(currentUserId) && note.authorId === currentUserId

  function beginEdit() {
    setDraft(note.body)
    onEdit()
  }

  async function save() {
    const nextBody = (await editorRef.current?.flush()) ?? draft
    setDraft(nextBody)
    onSave(nextBody)
  }

  return (
    <article className="876-card group overflow-hidden">
      <div className="bg-muted/25 flex items-center justify-between gap-2 border-b px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-foreground font-medium">
            {isAuthor ? 'You' : author}
          </span>
          {isDescription ? (
            <span className="text-muted-foreground">opened this request</span>
          ) : (
            <span className="text-muted-foreground" aria-hidden="true">
              ·
            </span>
          )}
          <span
            className="text-muted-foreground text-xs"
            suppressHydrationWarning
          >
            {formatNoteDate(note.createdAt)}
          </span>
          {note.editedAt ? (
            <span
              className="text-muted-foreground text-xs"
              title={`Edited ${formatNoteDate(note.editedAt)}`}
              suppressHydrationWarning
            >
              (edited)
            </span>
          ) : null}
          {isDescription ? (
            <Badge variant="secondary" className="px-1.5 text-[0.6875rem]">
              Description
            </Badge>
          ) : null}
        </div>

        {editing ? null : (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-7"
              onClick={beginEdit}
              disabled={busy}
              aria-label="Edit note"
              title="Edit note"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive size-7"
                onClick={onDelete}
                disabled={busy}
                aria-label="Delete note"
                title="Delete note"
              >
                {busy ? (
                  <ArrowPathIcon
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <TrashIcon className="size-3.5" aria-hidden="true" />
                )}
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Editor
              key={note.id}
              ref={editorRef}
              initialValue={draft}
              onChange={setDraft}
              placeholder="Update this note…"
              ariaLabel="Edit note"
              disabled={busy}
              autoFocus
              minHeight={100}
              className="border-input bg-background focus-within:border-ring focus-within:ring-ring/50 rounded-md border px-3 py-2 focus-within:ring-[3px]"
              holderClassName="min-h-24"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="info"
                size="sm"
                onClick={() => void save()}
                disabled={
                  busy ||
                  isEditorContentEmpty(draft) ||
                  editorContentEqual(draft, note.body)
                }
              >
                {busy ? 'Saving' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelEdit}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <EditorContent value={note.body} className="text-foreground/90" />
        )}
      </div>
    </article>
  )
}
