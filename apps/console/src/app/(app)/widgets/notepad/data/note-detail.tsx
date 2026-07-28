'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { browserNotes } from '@876/widgets/browser'
import { noteColorCssVars } from '@876/widgets/react'
import { Avatar, AvatarFallback, AvatarImage } from '@876/ui/avatar'
import { Badge } from '@876/ui/badge'
import { Button } from '@876/ui/button'
import { Separator } from '@876/ui/separator'
import { X } from '@876/ui/icons'
import { toast } from 'sonner'

import { formatNoteTimestamp, type AdminNoteRow } from './notes-split'

type Block = { type?: string; data?: Record<string, unknown> }

/**
 * Notes are stored as Editor.js JSON. The admin view renders the text those
 * blocks contain rather than the JSON itself — an admin reviewing a note wants
 * to read it, and full editor fidelity is the widget's job, not the console's.
 */
function toParagraphs(body: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    // Older notes were stored as plain text, never as JSON.
    return body.split(/\n{2,}/).filter(Boolean)
  }

  const blocks =
    parsed && typeof parsed === 'object' && 'blocks' in parsed
      ? ((parsed as { blocks?: unknown }).blocks ?? [])
      : []
  if (!Array.isArray(blocks)) return []

  return (blocks as Block[])
    .map((block) => {
      const data = block.data ?? {}
      if (typeof data.text === 'string') return stripTags(data.text)
      if (Array.isArray(data.items))
        return data.items
          .map((item) =>
            typeof item === 'string'
              ? stripTags(item)
              : stripTags(String((item as { content?: string })?.content ?? ''))
          )
          .filter(Boolean)
          .map((line) => `• ${line}`)
          .join('\n')
      return ''
    })
    .filter(Boolean)
}

function stripTags(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export function NoteDetail({
  note,
  onClose,
}: {
  note: AdminNoteRow
  onClose: () => void
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const paragraphs = toParagraphs(note.body)

  async function remove() {
    if (!window.confirm('Delete this note permanently?')) return
    setDeleting(true)
    const result = await browserNotes.adminDelete(note.id)
    setDeleting(false)
    if (result.error !== null) {
      toast.error(result.error)
      return
    }
    toast.success('Note deleted.')
    onClose()
    router.refresh()
  }

  return (
    <div className="876-card overflow-hidden">
      <div className="border-876-surface-border flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{note.title || 'Untitled'}</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Updated {formatNoteTimestamp(note.updatedAt)} · Created{' '}
            {formatNoteTimestamp(note.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {note.pinned && <Badge variant="secondary">Pinned</Badge>}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close note"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="p-5">
        <article
          style={noteColorCssVars(note.color)}
          className="rounded-lg border border-[var(--sticky-border)] bg-[var(--sticky-surface)] p-5 text-[var(--sticky-ink)] dark:border-[var(--sticky-border-dark)] dark:bg-[var(--sticky-surface-dark)] dark:text-[var(--sticky-ink-dark)]"
        >
          {paragraphs.length === 0 ? (
            <p className="text-sm opacity-70">This note is empty.</p>
          ) : (
            <div className="space-y-3 text-sm leading-6 whitespace-pre-wrap">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </article>

        <Separator className="my-5" />

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Owner</dt>
            <dd className="mt-1 flex items-center gap-2.5">
              <Avatar size="sm">
                {note.ownerAvatar ? (
                  <AvatarImage src={note.ownerAvatar} alt="" />
                ) : null}
                <AvatarFallback>
                  {(note.ownerName ?? note.ownerAccountId)
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0">
                <span className="block truncate">
                  {note.ownerName ?? 'Unknown account'}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {note.ownerEmail ?? note.ownerAccountId}
                </span>
              </span>
            </dd>
          </div>

          <div>
            <dt className="text-muted-foreground text-xs">Written in</dt>
            <dd className="mt-1">{note.sourceApp ?? 'Unattributed'}</dd>
          </div>
        </dl>
      </div>

      <div className="border-876-surface-border flex justify-end border-t px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={deleting}
          onClick={remove}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  )
}
