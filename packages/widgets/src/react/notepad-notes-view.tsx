'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { cn } from '@876/core/utils'
import {
  ArrowLeft,
  CheckIcon,
  LayoutList,
  Loader2Icon,
  MoreHorizontalIcon,
  Plus,
  SearchIcon,
  Star,
  Trash,
  XIcon,
} from '@876/ui/icons'
import { Button } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'
import { Input } from '@876/ui/input'
import { Skeleton } from '@876/ui/skeleton'

import type { NotepadCollection } from '../types/collections'
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

export type NotesScope =
  | { type: 'all' }
  | { type: 'unfiled' }
  | { type: 'collection'; id: string; name: string }

type NotepadEntry = Pick<
  NotepadNote,
  'id' | 'title' | 'body' | 'updated_at' | 'collection_id'
> & {
  color?: NoteColor | null
  pinned?: boolean | null
}

export function NotepadNotesView({
  entries,
  collections,
  scope,
  status,
  onScopeChange,
  onCreate,
  onOpen,
  onCreateCollection,
  onRenameCollection,
  onDeleteCollection,
  onLoadMore,
}: {
  entries: readonly NotepadEntry[]
  collections: readonly NotepadCollection[]
  scope: NotesScope
  status: 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted'
  onScopeChange: (scope: NotesScope) => void
  onCreate: () => void
  onOpen: (entryId: string) => void
  onCreateCollection: (name: string) => Promise<string | null>
  onRenameCollection: (id: string, name: string) => Promise<string | null>
  onDeleteCollection: (id: string) => Promise<string | null>
  onLoadMore: () => void
}) {
  const [search, setSearch] = useState('')
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [collectionBusy, setCollectionBusy] = useState(false)
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
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

  const showInitialLoading =
    status === 'LoadingFirstPage' && entries.length === 0
  const showEmpty = !showInitialLoading && entries.length === 0
  const showNoResults =
    !showInitialLoading && entries.length > 0 && filteredEntries.length === 0
  const showGrid = !showInitialLoading && filteredEntries.length > 0
  const showLoadMore =
    !showInitialLoading &&
    (status === 'CanLoadMore' || status === 'LoadingMore')
  const inCollection = scope.type === 'collection'
  const showCollectionBrowser = scope.type === 'all'

  async function submitNewCollection() {
    const name = newCollectionName.trim()
    if (!name || collectionBusy) return
    setCollectionBusy(true)
    setCollectionError(null)
    const error = await onCreateCollection(name)
    setCollectionBusy(false)
    if (error) {
      setCollectionError(error)
      return
    }
    setNewCollectionName('')
    setCreatingCollection(false)
  }

  async function submitRename() {
    if (!renamingId || collectionBusy) return
    const name = renameValue.trim()
    if (!name) return
    setCollectionBusy(true)
    setCollectionError(null)
    const error = await onRenameCollection(renamingId, name)
    setCollectionBusy(false)
    if (error) {
      setCollectionError(error)
      return
    }
    setRenamingId(null)
    setRenameValue('')
  }

  return (
    <section
      aria-label="Sticky notes"
      className="bg-background flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden"
    >
      <style>{NOTE_STICKY_COLOR_CSS}</style>
      <header className="bg-background/95 dark:bg-background/90 shrink-0 space-y-2 p-3 backdrop-blur-sm">
        {inCollection ? (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onScopeChange({ type: 'all' })}
              aria-label="Back to all notes"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft aria-hidden="true" />
            </Button>
            <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
              {scope.name}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Collection actions"
                    className="text-muted-foreground"
                  >
                    <MoreHorizontalIcon aria-hidden="true" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-36">
                <DropdownMenuItem
                  onClick={() => {
                    setRenamingId(scope.id)
                    setRenameValue(scope.name)
                    setCollectionError(null)
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    void onDeleteCollection(scope.id)
                  }}
                >
                  <Trash aria-hidden="true" className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label={
                inCollection ? 'Search in collection' : 'Search notes'
              }
              placeholder={
                inCollection ? 'Search in collection' : 'Search notes'
              }
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

        {!inCollection ? (
          <div
            role="tablist"
            aria-label="Note scope"
            className="flex flex-wrap items-center gap-1.5"
          >
            <ScopeChip
              active={scope.type === 'all'}
              onClick={() => onScopeChange({ type: 'all' })}
            >
              All
            </ScopeChip>
            <ScopeChip
              active={scope.type === 'unfiled'}
              onClick={() => onScopeChange({ type: 'unfiled' })}
            >
              Unfiled
            </ScopeChip>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-7 px-2 text-xs"
              onClick={() => {
                setCreatingCollection(true)
                setCollectionError(null)
              }}
            >
              <Plus aria-hidden="true" className="size-3.5" />
              Collection
            </Button>
          </div>
        ) : null}

        {creatingCollection || renamingId ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Input
                value={renamingId ? renameValue : newCollectionName}
                onChange={(event) =>
                  renamingId
                    ? setRenameValue(event.target.value)
                    : setNewCollectionName(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void (renamingId ? submitRename() : submitNewCollection())
                  }
                  if (event.key === 'Escape') {
                    setCreatingCollection(false)
                    setRenamingId(null)
                    setCollectionError(null)
                  }
                }}
                aria-label={
                  renamingId ? 'Collection name' : 'New collection name'
                }
                placeholder="Collection name"
                maxLength={80}
                autoFocus
                disabled={collectionBusy}
                className="bg-muted/50 dark:bg-muted/30 h-8 shadow-none"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={collectionBusy}
                aria-label={renamingId ? 'Save name' : 'Create collection'}
                onClick={() =>
                  void (renamingId ? submitRename() : submitNewCollection())
                }
              >
                {collectionBusy ? (
                  <Loader2Icon aria-hidden="true" className="animate-spin" />
                ) : (
                  <CheckIcon aria-hidden="true" />
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={collectionBusy}
                aria-label="Cancel"
                onClick={() => {
                  setCreatingCollection(false)
                  setRenamingId(null)
                  setCollectionError(null)
                }}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </div>
            {collectionError ? (
              <p role="alert" className="text-destructive text-xs">
                {collectionError}
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="bg-muted/25 dark:bg-muted/15 min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3">
        {showCollectionBrowser && collections.length > 0 ? (
          <div className="mb-4">
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Collections
            </p>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() =>
                    onScopeChange({
                      type: 'collection',
                      id: collection.id,
                      name: collection.name,
                    })
                  }
                  className={cn(
                    'bg-card hover:bg-accent/40 border-border flex min-h-16 min-w-0 flex-col rounded-xl border p-3 text-left shadow-xs transition-colors',
                    'focus-visible:ring-ring focus-visible:ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <LayoutList
                      aria-hidden="true"
                      className="text-muted-foreground size-3.5 shrink-0"
                    />
                    <span className="truncate text-sm font-medium">
                      {collection.name}
                    </span>
                  </span>
                  <span className="text-muted-foreground mt-1 text-xs tabular-nums">
                    {collection.note_count}{' '}
                    {collection.note_count === 1 ? 'note' : 'notes'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showCollectionBrowser && collections.length > 0 ? (
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Notes
          </p>
        ) : null}

        {showInitialLoading ? <NotepadLoadingState /> : null}
        {showEmpty ? (
          <NotepadEmptyState
            onCreate={onCreate}
            scope={scope}
            onCreateCollection={() => {
              setCreatingCollection(true)
              setCollectionError(null)
            }}
          />
        ) : null}
        {showNoResults ? (
          <NotepadNoResults onClear={() => setSearch('')} />
        ) : null}
        {showGrid ? (
          <div className="grid min-w-0 grid-cols-2 gap-3">
            {filteredEntries.map((entry) => (
              <NoteCard
                key={entry.id}
                entry={entry}
                onOpen={() => onOpen(entry.id)}
              />
            ))}
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

function ScopeChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'h-7 rounded-full px-2.5 text-xs font-medium transition-colors',
        active
          ? 'bg-foreground text-background'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
    >
      {children}
    </button>
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
            className="text-primary size-3.5 shrink-0 fill-current"
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
      className="grid grid-cols-2 gap-3"
    >
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
  )
}

function NotepadEmptyState({
  onCreate,
  scope,
  onCreateCollection,
}: {
  onCreate: () => void
  scope: NotesScope
  onCreateCollection: () => void
}) {
  const title =
    scope.type === 'collection'
      ? 'No notes in this collection'
      : scope.type === 'unfiled'
        ? 'No unfiled notes'
        : 'No notes yet'

  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center px-4 text-center">
      <NotepadIcon className="text-muted-foreground size-8" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCreate}
          className={NEW_NOTE_BUTTON_CLASS}
        >
          <Plus aria-hidden="true" />
          New note
        </Button>
        {scope.type === 'all' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCreateCollection}
          >
            <Plus aria-hidden="true" />
            Collection
          </Button>
        ) : null}
      </div>
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
