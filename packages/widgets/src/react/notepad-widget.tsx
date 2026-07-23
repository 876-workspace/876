'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { browserCollections, browserNotes } from '../browser/notes'
import type { NotepadCollection } from '../types/collections'
import type { NotepadNote } from '../types/notes'
import {
  createDraftNoteId,
  DEFAULT_NOTE_TITLE,
  isDraftNoteId,
} from './notepad-draft'
import { DEFAULT_NOTE_COLOR, type NoteColor } from './notepad-format'
import { NotepadEditor } from './notepad-editor'
import { NotepadNotesView, type NotesScope } from './notepad-notes-view'
import { WidgetPanelSkeleton } from './widget-loading'
import { useWidgetPanelLifecycle } from './widget-popout'

type PendingEntry = {
  id: string
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  collection_id: string | null
  updated_at: number
}

function toPending(note: NotepadNote): PendingEntry {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    color: note.color ?? DEFAULT_NOTE_COLOR,
    pinned: note.pinned,
    collection_id: note.collection_id,
    updated_at: note.updated_at,
  }
}

function pendingAsNote(pending: PendingEntry): NotepadNote {
  return {
    object: 'note',
    id: pending.id,
    owner_account_id: '',
    collection_id: pending.collection_id,
    title: pending.title,
    body: pending.body,
    color: pending.color,
    pinned: pending.pinned,
    created_at: pending.updated_at,
    updated_at: pending.updated_at,
  }
}

function listParamsForScope(scope: NotesScope) {
  if (scope.type === 'collection') return { collection_id: scope.id }
  if (scope.type === 'unfiled') return { unfiled: true as const }
  return {}
}

export function NotepadWidget() {
  return <NotepadWidgetPanel />
}

export function NotepadWidgetPanel() {
  const [entries, setEntries] = useState<NotepadNote[]>([])
  const [collections, setCollections] = useState<NotepadCollection[]>([])
  const [scope, setScope] = useState<NotesScope>({ type: 'all' })
  const [status, setStatus] = useState<
    'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted'
  >('LoadingFirstPage')
  const [hasMore, setHasMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  /** Stable React key for the open editor session (survives draft → server id). */
  const [editorSessionKey, setEditorSessionKey] = useState<string | null>(null)
  const [pendingEntry, setPendingEntry] = useState<PendingEntry | null>(null)
  const panelLifecycle = useWidgetPanelLifecycle()
  const entriesRef = useRef(entries)
  const scopeRef = useRef(scope)
  const refreshGenerationRef = useRef(0)
  entriesRef.current = entries
  scopeRef.current = scope

  const refreshCollections = useCallback(async () => {
    const result = await browserCollections.list()
    if (result.error || !result.data) return
    setCollections(result.data.data)
  }, [])

  const refresh = useCallback(async (cursor?: string) => {
    const generation = ++refreshGenerationRef.current
    const activeScope = scopeRef.current

    // Only flip to the first-page skeleton when we have nothing to show.
    // Re-fetching after closing the editor (or any silent refresh) keeps the
    // existing grid — never stack placeholders on top of real notes.
    if (cursor) setStatus('LoadingMore')
    else if (entriesRef.current.length === 0) setStatus('LoadingFirstPage')

    setLoadError(null)
    const result = await browserNotes.list({
      limit: 50,
      starting_after: cursor,
      ...listParamsForScope(activeScope),
    })

    // Drop stale responses from overlapping refreshes.
    if (generation !== refreshGenerationRef.current) return

    if (result.error || !result.data) {
      setLoadError(result.error ?? 'Unable to load notes.')
      setStatus('Exhausted')
      return
    }
    const page = result.data
    setEntries((prev) => (cursor ? [...prev, ...page.data] : page.data))
    setHasMore(page.has_more)
    setStatus(page.has_more ? 'CanLoadMore' : 'Exhausted')
  }, [])

  useEffect(() => {
    void refreshCollections()
  }, [refreshCollections])

  useEffect(() => {
    setEntries([])
    setHasMore(false)
    void refresh()
  }, [scope, refresh])

  // Always land on the home grid when the widget panel is closed or switched.
  useEffect(() => {
    return panelLifecycle?.registerBeforeDeactivate(() => {
      setSelectedId(null)
      setEditorSessionKey(null)
      setPendingEntry(null)
      return true
    })
  }, [panelLifecycle])

  const selectedEntry =
    (selectedId
      ? (entries.find((entry) => entry.id === selectedId) ?? null)
      : null) ??
    (pendingEntry &&
    selectedId &&
    (pendingEntry.id === selectedId || isDraftNoteId(selectedId))
      ? pendingAsNote(pendingEntry)
      : null)

  function openNote(entryId: string) {
    setPendingEntry(null)
    setEditorSessionKey(entryId)
    setSelectedId(entryId)
  }

  function addEntry() {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const collectionId = scope.type === 'collection' ? scope.id : null
    const draft: PendingEntry = {
      id: createDraftNoteId(),
      title: '',
      body: '',
      color: DEFAULT_NOTE_COLOR,
      pinned: false,
      collection_id: collectionId,
      updated_at: nowSeconds,
    }
    setPendingEntry(draft)
    setEditorSessionKey(draft.id)
    setSelectedId(draft.id)
  }

  function closeEditor() {
    setSelectedId(null)
    setEditorSessionKey(null)
    setPendingEntry(null)
    void refresh()
    void refreshCollections()
  }

  function handlePersisted(note: NotepadNote) {
    // Merge into the list always. Only stay on the editor if the user is still
    // viewing the local draft that just finished creating — never yank them
    // back if they already returned home while the create was in flight.
    setEntries((prev) => {
      const withoutSame = prev.filter((entry) => entry.id !== note.id)
      const matchesScope =
        scope.type === 'all' ||
        (scope.type === 'unfiled' && note.collection_id === null) ||
        (scope.type === 'collection' && note.collection_id === scope.id)
      return matchesScope ? [note, ...withoutSame] : withoutSame
    })
    setSelectedId((current) =>
      current && isDraftNoteId(current) ? note.id : current
    )
    setPendingEntry((prev) =>
      prev && isDraftNoteId(prev.id) ? toPending(note) : prev
    )
    void refreshCollections()
    // editorSessionKey stays put so the editor does not remount mid-type.
  }

  function handleDiscardDraft() {
    setPendingEntry(null)
    setSelectedId(null)
    setEditorSessionKey(null)
  }

  async function handleCreateCollection(name: string) {
    const result = await browserCollections.create({ name })
    if (result.error || !result.data) return result.error ?? 'Unable to create.'
    setCollections((prev) =>
      [...prev, result.data!].toSorted((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
    )
    setScope({ type: 'collection', id: result.data.id, name: result.data.name })
    return null
  }

  async function handleRenameCollection(id: string, name: string) {
    const result = await browserCollections.update(id, { name })
    if (result.error || !result.data) return result.error ?? 'Unable to rename.'
    setCollections((prev) =>
      prev
        .map((item) => (item.id === id ? result.data! : item))
        .toSorted((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        )
    )
    setScope((current) =>
      current.type === 'collection' && current.id === id
        ? { type: 'collection', id, name: result.data!.name }
        : current
    )
    return null
  }

  async function handleDeleteCollection(id: string) {
    const result = await browserCollections.delete(id)
    if (result.error) return result.error
    setCollections((prev) => prev.filter((item) => item.id !== id))
    setScope((current) =>
      current.type === 'collection' && current.id === id
        ? { type: 'all' }
        : current
    )
    return null
  }

  if (status === 'LoadingFirstPage' && entries.length === 0 && !loadError)
    return <WidgetPanelSkeleton label="Loading notes" />

  if (loadError && entries.length === 0)
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium">Unable to load notes</p>
        <p className="text-muted-foreground mt-1 max-w-64 text-xs leading-5">
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="border-876-surface-border bg-876-surface mt-4 rounded-lg border px-3 py-2 text-xs font-medium shadow-xs"
        >
          Try again
        </button>
      </div>
    )

  if (selectedEntry && editorSessionKey)
    return (
      <NotepadEditor
        key={editorSessionKey}
        entry={{
          ...selectedEntry,
          title:
            selectedEntry.title === DEFAULT_NOTE_TITLE
              ? ''
              : selectedEntry.title,
        }}
        collections={collections}
        onBack={closeEditor}
        onDeleted={closeEditor}
        onPersisted={handlePersisted}
        onDiscardDraft={handleDiscardDraft}
      />
    )

  return (
    <NotepadNotesView
      entries={entries}
      collections={collections}
      scope={scope}
      status={status}
      onScopeChange={setScope}
      onCreate={addEntry}
      onOpen={openNote}
      onCreateCollection={handleCreateCollection}
      onRenameCollection={handleRenameCollection}
      onDeleteCollection={handleDeleteCollection}
      onLoadMore={() => {
        if (!hasMore || status === 'LoadingMore') return
        const last = entries[entries.length - 1]
        if (last) void refresh(last.id)
      }}
    />
  )
}
