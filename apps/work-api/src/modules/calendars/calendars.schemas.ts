import {
  createWorkCalendarInputSchema,
  updateWorkCalendarInputSchema,
  workCalendarVisibilitySchema,
} from '@876/work'
import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const calendarParamsSchema = organizationParamsSchema.extend({
  calendarId: z.string().trim().min(1),
})

export const listCalendarsQuerySchema = z
  .strictObject({
    user_id: z.string().trim().min(1).optional(),
    visibility: workCalendarVisibilitySchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })

export const createCalendarBodySchema = createWorkCalendarInputSchema
export const updateCalendarBodySchema = updateWorkCalendarInputSchema
export const ensurePrimaryCalendarBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
  timeZone: z.string().trim().min(1).max(120),
})
export const deleteCalendarBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
