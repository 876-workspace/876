import type { NotepadNote } from '@/lib/db'
import { NOTE_COLORS, type NoteColor, type NotepadNoteResource } from './types'

export function resolveColor(
  color: string | null | undefined
): NoteColor | null {
  if (!color) return null
  return (NOTE_COLORS as readonly string[]).includes(color)
    ? (color as NoteColor)
    : null
}

export function serializeNote(row: NotepadNote): NotepadNoteResource {
  return {
    object: 'note',
    id: row.id,
    owner_account_id: row.ownerAccountId,
    title: row.title,
    body: row.body,
    color: resolveColor(row.color),
    pinned: row.pinned,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}
