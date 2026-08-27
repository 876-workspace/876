'use client'

import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import {
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  Pencil,
  PlusIcon,
  TrashIcon,
  UserIcon,
} from '@876/ui/icons'
import { CustomerAvatar } from '@876/ui/customer-avatar'
import { Textarea } from '@876/ui/textarea'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { client } from '@/lib/client'
import type { CrmRequestNote } from '@/types/crm'

/** A member as the thread needs them: who they are, and what they look like. */
export type NoteAuthor = {
  name: string
  avatar?: string | null
}

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
  requestId,
  notes,
  currentUserId,
  authors = {},
}: {
  requestId: string
  notes: CrmRequestNote[]
  currentUserId?: string
  /**
   * Author id → display name and picture. A note only carries an opaque
   * `authorId`, and rendering two characters of that id ("69") names nobody
   * and pictures nobody; the page already loads the org's members, so it
   * resolves both and passes them down.
   */
  authors?: Record<string, NoteAuthor>
}) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [isInternal, setIsInternal] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // The server list is the only source of truth. A local mirror of it has to be
  // resynced whenever the server refreshes, and getting that wrong either
  // freezes the thread or forces a render-phase state update; every mutation
  // already ends in `router.refresh()`, so there is nothing for a mirror to add.
  const { description, thread } = useMemo(() => {
    const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt)
    return {
      description: sorted.find((note) => note.kind === 'DESCRIPTION') ?? null,
      thread: sorted.filter((note) => note.kind !== 'DESCRIPTION'),
    }
  }, [notes])

  // A mutation is not finished when its request returns — it is finished when
  // the refreshed server list has rendered, so the transition counts too.
  const isSubmitting = busyId === COMPOSER || isPending

  async function addNote(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return

    setBusyId(COMPOSER)
    const result = await client.requestNotes.create(requestId, {
      body: trimmed,
      internal: isInternal,
    })
    setBusyId(null)
    if (result.error) {
      toast.error(result.error.message ?? 'Failed to add note.')
      return
    }

    setBody('')
    startTransition(() => router.refresh())
  }

  async function saveEdit(noteId: string, nextBody: string) {
    const trimmed = nextBody.trim()
    if (!trimmed) {
      toast.error('A note cannot be empty.')
      return
    }

    setBusyId(noteId)
    const result = await client.requestNotes.update(requestId, noteId, {
      body: trimmed,
    })
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
    const result = await client.requestNotes.delete(requestId, noteId)
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

      {/*
        The avatar is the timeline node. A separate coloured dot beside an
        avatar is decoration that says nothing the avatar does not already say,
        and it is what made the thread read as ornament rather than a record.
      */}
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
            <Textarea
              id={NEW_NOTE_FIELD_ID}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              placeholder="Add a note or progress update…"
              className="min-h-24"
              disabled={isSubmitting}
              aria-label="New note"
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
                disabled={isSubmitting || !body.trim()}
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

/**
 * One entry on the rail. `node` straddles the line at the entry's top-left;
 * everything else flows in the entry's own width.
 */
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

/**
 * Resolve a note's opaque author id against the org's members. Falling back to
 * the id is deliberate — inventing a name for an author who has left the org
 * would be worse than showing the raw identifier the record actually holds.
 */
function resolveAuthor(
  authorId: string,
  authors: Record<string, NoteAuthor>
): NoteAuthor {
  return authors[authorId] ?? { name: authorId }
}

/** The rail node for an author — picture, monogram, or a neutral glyph. */
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
  /** Omitted for the opening note, which cannot be deleted. */
  onDelete?: () => void
}) {
  const [draft, setDraft] = useState(note.body)
  const isDescription = note.kind === 'DESCRIPTION'
  const isAuthor = Boolean(currentUserId) && note.authorId === currentUserId

  function beginEdit() {
    setDraft(note.body)
    onEdit()
  }

  return (
    <article className="876-card group overflow-hidden">
      {/*
        A header strip separates who-and-when from what-was-said, the way an
        issue comment does. The opening note is distinguished by its label, not
        by tinting the whole surface.
      */}
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
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-24"
              disabled={busy}
              autoFocus
              aria-label="Edit note"
              onKeyDown={(event) => {
                if (event.key === 'Escape') onCancelEdit()
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="info"
                size="sm"
                onClick={() => onSave(draft)}
                disabled={busy || !draft.trim() || draft.trim() === note.body}
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
          <button
            type="button"
            onClick={beginEdit}
            className="text-foreground/90 block w-full cursor-text text-left text-sm leading-relaxed break-words whitespace-pre-wrap"
            aria-label="Edit note"
          >
            {note.body}
          </button>
        )}
      </div>
    </article>
  )
}
