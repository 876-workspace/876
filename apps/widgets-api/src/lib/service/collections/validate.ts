import { err, type ServiceErr } from '../result'
import { parseColor } from '../notes/validate'
import type { NoteColor } from '../notes/types'
import { MAX_COLLECTION_NAME_LENGTH } from './types'

export function validateCollectionName(name: string): ServiceErr | null {
  const trimmed = name.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_COLLECTION_NAME_LENGTH)
    return err(
      `Collection names must be between 1 and ${MAX_COLLECTION_NAME_LENGTH} characters.`,
      400,
      'widgets/invalid-collection-name'
    )
  return null
}

export function parseCollectionColor(
  color: unknown
): NoteColor | null | undefined | ServiceErr {
  if (color === null) return null
  return parseColor(color)
}
