import { z } from 'zod'

/**
 * The recurrence shape both event and reminder writes accept. Stored
 * occurrences are never expanded from the client: this is the rule, and the API
 * expands it on read.
 */
export const recurrenceInputSchema = z.strictObject({
  freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).max(1000).optional(),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: z.number().int().nonnegative().optional(),
  count: z.number().int().min(1).max(10000).optional(),
})

export const nullableRecurrenceInputSchema = recurrenceInputSchema.nullable()
