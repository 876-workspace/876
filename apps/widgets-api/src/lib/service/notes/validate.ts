import { err, type ServiceErr } from '../result'
import {
  MAX_BODY_LENGTH,
  MAX_TITLE_LENGTH,
  NOTE_COLORS,
  type NoteColor,
} from './types'

export function validateEntryText(
  title: string,
  body: string
): ServiceErr | null {
  const trimmed = title.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_TITLE_LENGTH)
    return err(
      `Notepad titles must be between 1 and ${MAX_TITLE_LENGTH} characters.`,
      400,
      'widgets/invalid-title'
    )
  if (body.length > MAX_BODY_LENGTH)
    return err(
      `Notepad entries cannot exceed ${MAX_BODY_LENGTH} characters.`,
      400,
      'widgets/invalid-body'
    )
  return null
}

export function parseColor(color: unknown): NoteColor | undefined | ServiceErr {
  if (color === undefined) return undefined
  if (
    typeof color !== 'string' ||
    !(NOTE_COLORS as readonly string[]).includes(color)
  )
    return err('Invalid note color.', 400, 'widgets/invalid-color')
  return color as NoteColor
}
