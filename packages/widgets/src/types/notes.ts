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
