import { z } from 'zod'

export const exportWorkItemsQuerySchema = z.strictObject({
  project: z.string().trim().min(1).optional(),
})

export type ExportWorkItemsQuery = z.infer<typeof exportWorkItemsQuerySchema>

export const exportTimeEntriesQuerySchema = z.strictObject({
  projectId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
})

export type ExportTimeEntriesQuery = z.infer<typeof exportTimeEntriesQuerySchema>
