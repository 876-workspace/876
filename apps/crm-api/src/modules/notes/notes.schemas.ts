import { z } from 'zod'

import { richContentSchema } from '../../types/rich-content.js'

export const requestParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const noteParamsSchema = requestParamsSchema.extend({
  noteId: z.string().trim().min(1),
})

export const listNotesQuerySchema = z.strictObject({
  viewer_id: z.string().trim().min(1).optional(),
  include_private: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
})

export const createNoteBodySchema = z.strictObject({
  body: richContentSchema(10_000),
  authorId: z.string().trim().min(1),
  visibility: z.enum(['PUBLIC', 'INTERNAL', 'PRIVATE']).optional(),
  internal: z.boolean().optional(),
})

export const updateNoteBodySchema = z.strictObject({
  body: richContentSchema(10_000),
  editedBy: z.string().trim().min(1),
  includePrivate: z.boolean().optional(),
})

export const deleteNoteBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
  includePrivate: z.boolean().optional(),
})
