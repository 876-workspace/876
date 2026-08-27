import type { EditorContentData } from '@876/editor'
import {
  emptyEditorContent,
  getEditorPlainText,
  isEditorContentEmpty,
  parseEditorContent,
  serializeEditorContent,
} from '@876/editor'

export type NoteEditorData = EditorContentData

/** Parse stored note body (Editor.js JSON or legacy plain text). */
export const parseNoteBody = parseEditorContent

/** Serialize Editor.js output for the existing string-backed note body. */
export const serializeNoteBody = serializeEditorContent

/** Extract note text for search, previews, and counters. */
export const getNotePlainText = getEditorPlainText

export const isNoteBodyEmpty = isEditorContentEmpty

export const emptyNoteBody = emptyEditorContent
