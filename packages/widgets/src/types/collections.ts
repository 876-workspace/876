import { z } from 'zod'

import { noteColorSchema } from './notes'

export const notepadCollectionSchema = z.object({
  object: z.literal('collection'),
  id: z.string(),
  owner_account_id: z.string(),
  name: z.string(),
  color: noteColorSchema.nullable(),
  note_count: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
})

export type NotepadCollection = z.infer<typeof notepadCollectionSchema>

export const collectionListSchema = z.object({
  object: z.literal('list'),
  data: z.array(notepadCollectionSchema),
  has_more: z.boolean(),
  url: z.string(),
  total_count: z.number().nullable(),
})

export type CollectionList = z.infer<typeof collectionListSchema>

export const deletedCollectionSchema = z.object({
  object: z.literal('collection'),
  id: z.string(),
  deleted: z.literal(true),
})

export type DeletedCollection = z.infer<typeof deletedCollectionSchema>
