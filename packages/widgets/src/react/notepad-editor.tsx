'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { cn } from '@876/core/utils'
import { ArrowLeft, LayoutList, Loader2Icon, Star, Trash } from '@876/ui/icons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@876/ui/alert-dialog'
import { Button } from '@876/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@876/ui/dropdown-menu'

import { browserNotes } from '../browser/notes'
import type { NotepadCollection } from '../types/collections'
import type { NotepadNote } from '../types/notes'
import { NotepadBodyEditor } from './notepad-body-editor'
import {
  DEFAULT_NOTE_TITLE,
  isDraftNoteId,
  isEmptyNoteDraft,
  titleForDisplay,
  titleForEditor,
  titleForPersist,
} from './notepad-draft'
import { useWidgetPanelLifecycle } from './widget-popout'
import type { NotepadBodyEditorHandle } from '../types/notepad'
import {
  getNoteCharacterCount,
  getNoteWordCount,
  noteColorCssVars,
  NOTE_COLOR_PALETTE,
  NOTE_COLORS,
  NOTE_STICKY_COLOR_CSS,
  resolveNoteColor,
  type NoteColor,
} from './notepad-format'

type NotepadEntry = Pick<
  NotepadNote,
  'id' | 'title' | 'body' | 'updated_at' | 'collection_id'
> & {
  color?: NoteColor | null
  pinned?: boolean | null
}

type NoteDraft = {
  title: string
  body: string
  color: NoteColor
  pinned: boolean
  collectionId: string | null
}

const AUTO_SAVE_MS = 650

export function NotepadEditor({
  entry,
  collections = [],
  onBack,
  onDeleted,
  onPersisted,
  onDiscardDraft,
}: {
  entry: NotepadEntry
  collections?: readonly NotepadCollection[]
  onBack: () => void
  onDeleted: () => void
  /** Called after any successful save (create or update) with the server note. */
  onPersisted?: (note: NotepadNote) => void
  /** Called when an empty local draft is abandoned (no server row). */
  onDiscardDraft?: () => void
}) {
  const [noteId, setNoteId] = useState(entry.id)
  const [title, setTitle] = useState(() => titleForEditor(entry.title))
  const [body, setBody] = useState(entry.body)
  const [color, setColor] = useState<NoteColor>(resolveNoteColor(entry.color))
  const [pinned, setPinned] = useState(Boolean(entry.pinned))
  const [collectionId, setCollectionId] = useState<string | null>(
    entry.collection_id ?? null
  )
  const [savedTitle, setSavedTitle] = useState(() =>
    titleForEditor(entry.title)
  )
  const [savedBody, setSavedBody] = useState(entry.body)
  const [savedColor, setSavedColor] = useState<NoteColor>(
    resolveNoteColor(entry.color)
  )
  const [savedPinned, setSavedPinned] = useState(Boolean(entry.pinned))
  const [savedCollectionId, setSavedCollectionId] = useState<string | null>(
    entry.collection_id ?? null
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const bodyEditorRef = useRef<NotepadBodyEditorHandle>(null)
  const noteIdRef = useRef(noteId)
  const draftRef = useRef<NoteDraft>({
    title,
    body,
    color,
    pinned,
    collectionId,
  })
  const savedDraftRef = useRef<NoteDraft>({
    title: savedTitle,
    body: savedBody,
    color: savedColor,
    pinned: savedPinned,
    collectionId: savedCollectionId,
  })
  const saveInFlightRef = useRef<Promise<boolean> | null>(null)
  const deletingRef = useRef(false)
  const panelLifecycle = useWidgetPanelLifecycle()
  noteIdRef.current = noteId
  draftRef.current = { title, body, color, pinned, collectionId }
  savedDraftRef.current = {
    title: savedTitle,
    body: savedBody,
    color: savedColor,
    pinned: savedPinned,
    collectionId: savedCollectionId,
  }
  const dirty =
    title !== savedTitle ||
    body !== savedBody ||
    color !== savedColor ||
    pinned !== savedPinned ||
    collectionId !== savedCollectionId
  const collectionLabel =
    collections.find((item) => item.id === collectionId)?.name ?? 'Unfiled'
  const isDraft = isDraftNoteId(noteId)
  const words = useMemo(() => getNoteWordCount(body), [body])
  const characters = useMemo(() => getNoteCharacterCount(body), [body])
  const colorVars = noteColorCssVars(color)
  const displayTitle = titleForDisplay(title)

  const saveEntry = useCallback(async () => {
    while (true) {
      if (deletingRef.current) return true

      const activeSave = saveInFlightRef.current
      if (activeSave) {
        await activeSave
        continue
      }

      const flushedBody = await bodyEditorRef.current?.flush()
      if (deletingRef.current) return true
      if (saveInFlightRef.current) continue

      const currentDraft = {
        ...draftRef.current,
        body: flushedBody ?? draftRef.current.body,
      }
      draftRef.current = currentDraft

      const currentId = noteIdRef.current
      const draftStillLocal = isDraftNoteId(currentId)

      // Empty local drafts never create a server row.
      if (
        draftStillLocal &&
        isEmptyNoteDraft(currentDraft.title, currentDraft.body)
      )
        return true

      const nextDraft = {
        ...currentDraft,
        title: titleForPersist(currentDraft.title),
      }

      const savedDraft = savedDraftRef.current
      const savedPersistTitle = titleForPersist(savedDraft.title)
      const hasChanges =
        draftStillLocal ||
        nextDraft.title !== savedPersistTitle ||
        currentDraft.body !== savedDraft.body ||
        currentDraft.color !== savedDraft.color ||
        currentDraft.pinned !== savedDraft.pinned ||
        currentDraft.collectionId !== savedDraft.collectionId

      if (!hasChanges) return true

      setSaving(true)
      setSaveError(null)

      let savePromise: Promise<boolean> | null = null
      savePromise = (async () => {
        try {
          if (isDraftNoteId(noteIdRef.current)) {
            const result = await browserNotes.create({
              title: nextDraft.title,
              body: nextDraft.body,
              color: nextDraft.color,
              pinned: nextDraft.pinned,
              collection_id: nextDraft.collectionId,
            })
            if (result.error || !result.data) {
              setSaveError(result.error ?? 'Unable to save this note.')
              return false
            }

            const note = result.data
            noteIdRef.current = note.id
            setNoteId(note.id)

            const editorTitle = titleForEditor(note.title)
            const nextCollectionId = note.collection_id
            savedDraftRef.current = {
              title: editorTitle,
              body: note.body,
              color: resolveNoteColor(note.color),
              pinned: note.pinned,
              collectionId: nextCollectionId,
            }
            setSavedTitle(editorTitle)
            setSavedBody(note.body)
            setSavedColor(resolveNoteColor(note.color))
            setSavedPinned(note.pinned)
            setSavedCollectionId(nextCollectionId)
            setCollectionId(nextCollectionId)

            if (draftRef.current.title === currentDraft.title) {
              draftRef.current = {
                ...draftRef.current,
                title: editorTitle,
              }
              setTitle((value) =>
                value === currentDraft.title ? editorTitle : value
              )
            }

            onPersisted?.(note)
            return true
          }

          const result = await browserNotes.update(noteIdRef.current, {
            title: nextDraft.title,
            body: nextDraft.body,
            color: nextDraft.color,
            pinned: nextDraft.pinned,
            collection_id: nextDraft.collectionId,
          })
          if (result.error || !result.data) {
            setSaveError(result.error ?? 'Unable to save this note.')
            return false
          }

          // Merge the saved note into the panel list too — a background
          // save finishing after close would otherwise leave a stale card
          // (closeEditor's refresh races the in-flight update).
          onPersisted?.(result.data)

          const editorTitle = titleForEditor(nextDraft.title)
          savedDraftRef.current = {
            title: editorTitle,
            body: nextDraft.body,
            color: nextDraft.color,
            pinned: nextDraft.pinned,
            collectionId: nextDraft.collectionId,
          }
          setSavedTitle(editorTitle)
          setSavedBody(nextDraft.body)
          setSavedColor(nextDraft.color)
          setSavedPinned(nextDraft.pinned)
          setSavedCollectionId(nextDraft.collectionId)

          if (draftRef.current.title === currentDraft.title) {
            draftRef.current = {
              ...draftRef.current,
              title: editorTitle,
            }
            setTitle((value) =>
              value === currentDraft.title ? editorTitle : value
            )
          }

          return true
        } catch {
          setSaveError('Unable to save this note. Please try again.')
          return false
        } finally {
          if (saveInFlightRef.current === savePromise)
            saveInFlightRef.current = null
          setSaving(false)
        }
      })()
      saveInFlightRef.current = savePromise

      return savePromise
    }
  }, [onPersisted])

  useEffect(() => {
    return panelLifecycle?.registerBeforeDeactivate(() => {
      // Never block panel close. saveEntry flushes the body editor first, so
      // it sees keystrokes whose async onChange has not reached state yet —
      // deciding dirty/empty from state here could discard a just-typed
      // draft. It no-ops for clean notes and empty local drafts.
      void saveEntry()
      return true
    })
  }, [panelLifecycle, saveEntry])

  useEffect(() => {
    if (!dirty || saving || deleting) return

    // Empty local drafts do not hit the network until there is content.
    if (isDraft && isEmptyNoteDraft(title, body)) return

    const timer = window.setTimeout(() => {
      void saveEntry()
    }, AUTO_SAVE_MS)

    return () => window.clearTimeout(timer)
  }, [
    title,
    body,
    color,
    pinned,
    collectionId,
    dirty,
    saving,
    deleting,
    isDraft,
    saveEntry,
  ])

  async function returnToNotes() {
    // saveEntry flushes first and no-ops for empty local drafts, so this
    // never creates an empty server note and never loses a pending keystroke.
    void saveEntry()
    onBack()
  }

  async function deleteEntry() {
    if (isDraftNoteId(noteIdRef.current)) {
      onDiscardDraft?.()
      onDeleted()
      return
    }

    deletingRef.current = true
    setDeleting(true)
    setDeleteError(null)

    try {
      const result = await browserNotes.delete(noteIdRef.current)
      if (result.error) {
        setDeleteError(result.error)
        return
      }
      setDeleteOpen(false)
      onDeleted()
    } catch {
      setDeleteError('Unable to delete this note. Please try again.')
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  function saveWithShortcut(event: KeyboardEvent<HTMLInputElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault()
      void saveEntry()
    }
  }

  return (
    <section
      aria-label={`Editing ${displayTitle}`}
      className="bg-background flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden"
    >
      <style>{NOTE_STICKY_COLOR_CSS}</style>
      <header className="border-border/80 bg-background/95 supports-[backdrop-filter]:bg-background/80 flex h-12 shrink-0 items-center gap-2 border-b px-2.5 backdrop-blur-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={deleting}
          onClick={() => void returnToNotes()}
          aria-label="Back to notes"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" />
        </Button>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            'min-w-0 flex-1 truncate text-xs',
            dirty ? 'text-foreground/80' : 'text-muted-foreground'
          )}
        >
          {saving
            ? 'Saving…'
            : dirty
              ? 'Unsaved changes'
              : isDraft
                ? 'Draft'
                : 'Saved'}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deleting}
                aria-label={`Move to collection, currently ${collectionLabel}`}
                className="text-muted-foreground max-w-36 gap-1 px-2"
              >
                <LayoutList aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate text-xs">{collectionLabel}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuItem
              onClick={() => setCollectionId(null)}
              className={cn(collectionId === null && 'font-medium')}
            >
              Unfiled
            </DropdownMenuItem>
            {collections.map((collection) => (
              <DropdownMenuItem
                key={collection.id}
                onClick={() => setCollectionId(collection.id)}
                className={cn(collectionId === collection.id && 'font-medium')}
              >
                {collection.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={deleting}
          aria-label={pinned ? 'Unpin note' : 'Pin note'}
          aria-pressed={pinned}
          onClick={() => setPinned((value) => !value)}
          className={cn(
            pinned
              ? 'text-primary hover:text-primary/80'
              : 'text-muted-foreground'
          )}
        >
          <Star aria-hidden="true" className={cn(pinned && 'fill-current')} />
        </Button>
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(open) => {
            setDeleteOpen(open)
            if (open) setDeleteError(null)
          }}
        >
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={deleting}
                aria-label="Delete note"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash aria-hidden="true" />
              </Button>
            }
          />
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                “{titleForDisplay(savedTitle || title)}” will be permanently
                removed from every 876 app.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteError ? (
              <p role="alert" className="text-destructive text-sm">
                {deleteError}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleting}
                onClick={() => void deleteEntry()}
              >
                {deleting ? (
                  <Loader2Icon aria-hidden="true" className="animate-spin" />
                ) : (
                  <Trash aria-hidden="true" />
                )}
                {deleting ? 'Deleting…' : 'Delete note'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      {saveError ? (
        <p
          role="alert"
          className="border-destructive/20 bg-destructive/5 text-destructive border-b px-4 py-2 text-xs"
        >
          {saveError}
        </p>
      ) : null}

      <div
        className="note-sticky-editor flex min-h-0 flex-1 flex-col px-5 pt-4 pb-3"
        style={colorVars}
      >
        <input
          aria-label="Note title"
          value={title}
          maxLength={160}
          disabled={deleting}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={saveWithShortcut}
          className="placeholder:text-muted-foreground/80 w-full bg-transparent text-xl leading-7 font-semibold outline-none"
          placeholder={DEFAULT_NOTE_TITLE}
        />
        {/* No key: the parent editor already remounts per session, and the
            entry id flips from draft to server id mid-type — keying on it
            would remount Editor.js and clobber in-flight keystrokes. */}
        <NotepadBodyEditor
          ref={bodyEditorRef}
          initialBody={entry.body}
          autoFocus={isDraft}
          disabled={deleting}
          onChange={setBody}
        />
      </div>

      <footer className="border-border/80 bg-background/85 supports-[backdrop-filter]:bg-background/70 dark:bg-background/80 flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2.5 backdrop-blur-sm">
        <div
          role="group"
          aria-label="Note color"
          className="flex flex-wrap items-center gap-2"
        >
          {NOTE_COLORS.map((noteColor) => {
            const active = color === noteColor
            const palette = NOTE_COLOR_PALETTE[noteColor]
            return (
              <button
                key={noteColor}
                type="button"
                disabled={deleting}
                aria-label={`${palette.label} note`}
                aria-pressed={active}
                onClick={() => setColor(noteColor)}
                className={cn(
                  'note-sticky-swatch size-5 rounded-full border shadow-xs transition-transform',
                  active &&
                    'ring-ring ring-offset-background scale-110 ring-2 ring-offset-2',
                  'disabled:opacity-50'
                )}
                style={{
                  backgroundColor: palette.swatch,
                  borderColor: palette.swatchBorder,
                }}
              />
            )
          })}
        </div>
        <p className="text-muted-foreground min-w-0 truncate text-xs tabular-nums">
          {words} {words === 1 ? 'word' : 'words'} · {characters} characters
        </p>
      </footer>
    </section>
  )
}
