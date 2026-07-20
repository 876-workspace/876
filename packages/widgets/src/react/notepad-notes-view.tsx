'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { cn } from '@876/core/utils'
import { Loader2Icon, Plus, SearchIcon, Star, XIcon } from '@876/ui/icons'
import { Button } from '@876/ui/button'
import { Input } from '@876/ui/input'
import { Skeleton } from '@876/ui/skeleton'

import type { NotepadNote } from '../types/notes'
import { titleForDisplay } from './notepad-draft'
import {
  formatNoteUpdatedAt,
  getNotePreview,
  noteColorCssVars,
  NOTE_STICKY_COLOR_CSS,
  sortStickyNotes,
  type NoteColor,
} from './notepad-format'
import { NotepadIcon } from './notepad-icon'

/** Class styled in NOTE_STICKY_COLOR_CSS — sticky amber, not platform blue. */
const NEW_NOTE_BUTTON_CLASS = 'note-new-button'

type NotepadEntry = Pick<
  NotepadNote,
  'id' | 'title' | 'body' | 'updated_at'
> & {
  color?: NoteColor | null
  pinned?: boolean | null
}

export function NotepadNotesView({
  entries,
  status,
  onCreate,
  onOpen,
  onLoadMore,
}: {
  entries: readonly NotepadEntry[]
  status: 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted'
  onCreate: () => void
  onOpen: (entryId: string) => void
  onLoadMore: () => void
}) {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const filteredEntries = useMemo(() => {
    const query = deferredSearch.trim().toLocaleLowerCase()
    const matched = !query
      ? entries
      : entries.filter((entry) =>
          `${entry.title}\n${entry.body}`.toLocaleLowerCase().includes(query)
        )
    return sortStickyNotes(matched)
  }, [deferredSearch, entries])

  // Mutually exclusive body states — never stack skeletons on top of real cards.
  // LoadingFirstPage only owns the body when there is nothing cached to show.
  const showInitialLoading =
    status === 'LoadingFirstPage' && entries.length === 0
  const showEmpty = !showInitialLoading && entries.length === 0
  const showNoResults =
    !showInitialLoading && entries.length > 0 && filteredEntries.length === 0
  const showGrid = !showInitialLoading && filteredEntries.length > 0
  const showLoadMore =
    !showInitialLoading &&
    (status === 'CanLoadMore' || status === 'LoadingMore')

  return (
    <section
      aria-label="Sticky notes"
      className="bg-background flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden"
    >
      <style>{NOTE_STICKY_COLOR_CSS}</style>
      <header className="bg-background/95 dark:bg-background/90 shrink-0 p-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search notes"
              placeholder="Search notes"
              className="bg-muted/50 dark:bg-muted/30 pr-8 pl-8 shadow-none"
            />
            {search ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => setSearch('')}
                aria-label="Clear note search"
                className="absolute top-1/2 right-1.5 -translate-y-1/2"
              >
                <XIcon aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreate}
            disabled={showInitialLoading}
            className={NEW_NOTE_BUTTON_CLASS}
          >
            <Plus aria-hidden="true" />
            New note
          </Button>
        </div>
      </header>

      <div className="bg-muted/25 dark:bg-muted/15 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3">
        {showInitialLoading ? <NotepadLoadingState /> : null}
        {showEmpty ? <NotepadEmptyState onCreate={onCreate} /> : null}
        {showNoResults ? (
          <NotepadNoResults onClear={() => setSearch('')} />
        ) : null}
        {showGrid ? (
          <div className="@container min-w-0">
            <div
              className={cn(
                // sm→1 · md→2 · lg→3 · xl/fill→4 as the panel grows
                'grid min-w-0 grid-cols-1 gap-3',
                '@[360px]:grid-cols-2',
                '@[520px]:grid-cols-3',
                '@[720px]:grid-cols-4'
              )}
            >
              {filteredEntries.map((entry) => (
                <NoteCard
                  key={entry.id}
                  entry={entry}
                  onOpen={() => onOpen(entry.id)}
                />
              ))}
            </div>
          </div>
        ) : null}
        {showLoadMore ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={status === 'LoadingMore'}
            className="mt-3 w-full"
          >
            {status === 'LoadingMore' ? (
              <>
                <Loader2Icon aria-hidden="true" className="animate-spin" />
                Loading notes
              </>
            ) : (
              'Load older notes'
            )}
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function NoteCard({
  entry,
  onOpen,
}: {
  entry: NotepadEntry
  onOpen: () => void
}) {
  const pinned = Boolean(entry.pinned)
  const label = titleForDisplay(entry.title)
  const updatedMs =
    entry.updated_at < 1e12 ? entry.updated_at * 1000 : entry.updated_at

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${label}`}
      className={cn(
        'note-sticky-card flex min-h-36 min-w-0 flex-col rounded-xl border p-3 text-left shadow-xs transition-colors outline-none hover:shadow-sm focus-visible:ring-3',
        'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-offset-2'
      )}
      style={noteColorCssVars(entry.color)}
    >
      <span className="flex items-start gap-1.5">
        <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-5 font-semibold tracking-tight">
          {label}
        </span>
        {pinned ? (
          <Star
            aria-label="Pinned"
            className="size-3.5 shrink-0 fill-current text-amber-700 dark:text-amber-300"
          />
        ) : null}
      </span>
      <span className="mt-2 line-clamp-4 text-xs leading-5 opacity-75">
        {getNotePreview(entry.body)}
      </span>
      <span className="mt-auto pt-4 text-xs tabular-nums opacity-70">
        {formatNoteUpdatedAt(updatedMs)}
      </span>
    </button>
  )
}

function NotepadLoadingState() {
  return (
    <div
      role="status"
      aria-label="Loading notes"
      className="@container min-w-0"
    >
      <div className="grid grid-cols-1 gap-3 @[360px]:grid-cols-2 @[520px]:grid-cols-3">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="border-border bg-card/80 dark:bg-card/60 min-h-36 rounded-xl border p-3"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  )
}

function NotepadEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center px-4 text-center">
      <NotepadIcon className="text-muted-foreground size-8" />
      <p className="mt-3 text-sm font-medium">No notes yet</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCreate}
        className={cn('mt-3', NEW_NOTE_BUTTON_CLASS)}
      >
        <Plus aria-hidden="true" />
        New note
      </Button>
    </div>
  )
}

function NotepadNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium">No matching notes</p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2"
        onClick={onClear}
      >
        Clear search
      </Button>
    </div>
  )
}
