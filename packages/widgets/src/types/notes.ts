import { z } from 'zod'

export const noteColorSchema = z.enum([
  'yellow',
  'pink',
  'blue',
  'green',
  'purple',
  'gray',
])

export type NoteColor = z.infer<typeof noteColorSchema>

export const notepadNoteSchema = z.object({
  object: z.literal('note'),
  id: z.string(),
  owner_account_id: z.string(),
  collection_id: z.string().nullable(),
  title: z.string(),
  body: z.string(),
  color: noteColorSchema.nullable(),
  pinned: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
})

export type NotepadNote = z.infer<typeof notepadNoteSchema>

export const noteListSchema = z.object({
  object: z.literal('list'),
  data: z.array(notepadNoteSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().nullable(),
})

export type NoteList = z.infer<typeof noteListSchema>

export const deletedNoteSchema = z.object({
  object: z.literal('note'),
  id: z.string(),
  deleted: z.literal(true),
})

export type DeletedNote = z.infer<typeof deletedNoteSchema>

/**
 * Public note write params. Callers use camelCase; {@link toNoteBody} maps
 * them onto the widgets-api snake_case wire body.
 */
export type NoteWriteParams = {
  title?: string
  body?: string
  color?: NoteColor
  pinned?: boolean
  /** `null` unfiles the note; omit to leave the collection unchanged. */
  collectionId?: string | null
}

/** Params for creating a note — `title` and `body` are required. */
export type NoteCreateParams = NoteWriteParams &
  Required<Pick<NoteWriteParams, 'title' | 'body'>>

/** Public list params for member note listings. */
export type NoteListParams = {
  limit?: number
  startingAfter?: string
  collectionId?: string
  unfiled?: boolean
}

/** Public list params for admin note listings. */
export type AdminNoteListParams = {
  ownerAccountId?: string
  limit?: number
  startingAfter?: string
}

/**
 * Maps public {@link NoteWriteParams} onto the widgets-api wire body.
 *
 * Undefined fields are dropped by `JSON.stringify`, preserving PATCH
 * semantics: an omitted key leaves the field unchanged.
 */
export function toNoteBody(params: NoteWriteParams): Record<string, unknown> {
  return {
    title: params.title,
    body: params.body,
    color: params.color,
    pinned: params.pinned,
    collection_id: params.collectionId,
  }
}

/**
 * Maps public {@link NoteListParams} onto the widgets-api / host wire query.
 */
export function toNoteListQuery(
  params: NoteListParams = {}
): Record<string, string | number | undefined> {
  return {
    limit: params.limit,
    starting_after: params.startingAfter,
    collection_id: params.collectionId,
    unfiled: params.unfiled ? '1' : undefined,
  }
}

/**
 * Maps public {@link AdminNoteListParams} onto the widgets-api / host wire query.
 */
export function toAdminNoteListQuery(
  params: AdminNoteListParams = {}
): Record<string, string | number | undefined> {
  return {
    owner_account_id: params.ownerAccountId,
    limit: params.limit,
    starting_after: params.startingAfter,
  }
}
