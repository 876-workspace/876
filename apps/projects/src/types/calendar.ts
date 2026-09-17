import { z } from 'zod'

export const recurrenceInputSchema = z.strictObject({
  freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).max(1000).optional(),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: z.number().int().nonnegative().optional(),
  count: z.number().int().min(1).max(10000).optional(),
})

export const nullableRecurrenceInputSchema = recurrenceInputSchema.nullable()

export const CALENDAR_VIEWS = ['month', 'week', 'list'] as const
export type CalendarView = (typeof CALENDAR_VIEWS)[number]

export const DAY_SECONDS = 86_400

export type CalendarSearchParams = {
  view?: string
  from?: string
  to?: string
  project?: string
}

export type CalendarWindow = { from: number; to: number }

export type ResolvedCalendarWindow = CalendarWindow & { anchor: number }

export type CalendarNavDirection = 'previous' | 'next' | 'today'
