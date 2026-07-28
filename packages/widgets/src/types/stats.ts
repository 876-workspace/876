import { z } from 'zod'

export const notepadStatsSchema = z.object({
  object: z.literal('notepad_stats'),
  notes: z.number(),
  collections: z.number(),
  accounts: z.number(),
  pinned_notes: z.number(),
  filed_notes: z.number(),
  notes_created_last_30d: z.number(),
  notes_updated_last_30d: z.number(),
  active_accounts_last_30d: z.number(),
  generated_at: z.number(),
})

export type NotepadStats = z.infer<typeof notepadStatsSchema>
