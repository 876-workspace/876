import { isNoteBodyEmpty } from './notepad-editor-data'

/** Fallback title sent to the API when the user leaves the title field empty. */
export const DEFAULT_NOTE_TITLE = 'Untitled note'

const DRAFT_ID_PREFIX = 'draft_'

export function createDraftNoteId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return `${DRAFT_ID_PREFIX}${crypto.randomUUID()}`

  return `${DRAFT_ID_PREFIX}${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`
}

export function isDraftNoteId(id: string): boolean {
  return id.startsWith(DRAFT_ID_PREFIX)
}

/** UI value: treat server default title as empty so the placeholder can show. */
export function titleForEditor(title: string): string {
  const trimmed = title.trim()
  if (!trimmed || trimmed === DEFAULT_NOTE_TITLE) return ''
  return title
}

/** Persist value: empty → default title required by the widgets API. */
export function titleForPersist(title: string): string {
  const trimmed = title.trim()
  return trimmed || DEFAULT_NOTE_TITLE
}

/** Display label for cards, dialogs, and aria. */
export function titleForDisplay(title: string): string {
  const trimmed = title.trim()
  return trimmed || DEFAULT_NOTE_TITLE
}

export function isEmptyNoteDraft(title: string, body: string): boolean {
  return titleForEditor(title) === '' && isNoteBodyEmpty(body)
}
