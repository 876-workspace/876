import type { NotepadCollection } from '@/lib/db'
import { resolveColor } from '../notes/serialize'
import type { NotepadCollectionResource } from './types'

export function serializeCollection(
  row: NotepadCollection,
  noteCount = 0
): NotepadCollectionResource {
  return {
    object: 'collection',
    id: row.id,
    owner_account_id: row.ownerAccountId,
    name: row.name,
    color: resolveColor(row.color),
    note_count: noteCount,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  }
}
