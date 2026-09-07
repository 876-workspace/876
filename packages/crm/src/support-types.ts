import { z } from 'zod'

export const supportRequestDraftSchema = z.strictObject({
  subject: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).nullable().optional(),
  categoryId: z.string().trim().max(160).nullable().optional(),
})

export type SupportRequestDraft = z.infer<typeof supportRequestDraftSchema>
