import { z } from 'zod'

import { workRecurrenceFrequencySchema, workWeekdaySchema } from './types'

const timeZoneSchema = z.string().trim().min(1).max(120)

/**
 * Full replacement shape for a resource's recurrence series configuration.
 * Acting-user metadata is intentionally absent and must be injected server-side.
 */
export const workRecurrenceDraftSchema = z
  .strictObject({
    frequency: workRecurrenceFrequencySchema,
    interval: z.number().int().min(1).optional(),
    byDay: z.array(workWeekdaySchema).optional(),
    byMonthDay: z
      .array(
        z
          .number()
          .int()
          .min(-31)
          .max(31)
          .refine((value) => value !== 0)
      )
      .optional(),
    byMonth: z.array(z.number().int().min(1).max(12)).optional(),
    count: z.number().int().min(1).optional().nullable(),
    untilAt: z.number().int().optional().nullable(),
    timeZone: timeZoneSchema,
    weekStart: workWeekdaySchema.optional().nullable(),
  })
  .refine((value) => !(value.count != null && value.untilAt != null), {
    message: 'count and untilAt are mutually exclusive.',
  })

export type WorkRecurrenceDraft = z.infer<typeof workRecurrenceDraftSchema>
