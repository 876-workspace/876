import {
  createWorkEventParticipantInputSchema,
  updateWorkEventParticipantInputSchema,
  workEventBusyStatusSchema,
  workEventStatusSchema,
} from '@876/work'
import { z } from 'zod'

const idSchema = z.string().trim().min(1)
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export const requestParamsSchema = z.strictObject({
  organizationId: idSchema,
  id: idSchema,
})

export const eventParamsSchema = requestParamsSchema.extend({
  eventId: idSchema,
})

export const participantParamsSchema = eventParamsSchema.extend({
  participantId: idSchema,
})

const createBaseSchema = z.strictObject({
  calendarId: idSchema.optional(),
  title: z.string().trim().min(1).max(240),
  description: z.string().max(10_000).optional().nullable(),
  location: z.string().trim().max(1000).optional().nullable(),
  status: workEventStatusSchema.optional(),
  busyStatus: workEventBusyStatusSchema.optional(),
  recurrenceRuleId: idSchema.optional().nullable(),
  recurrenceId: idSchema.optional().nullable(),
  createdBy: idSchema,
})

export const createEventBodySchema = z.union([
  createBaseSchema
    .extend({
      allDay: z.literal(false),
      startAt: z.number().int(),
      endAt: z.number().int(),
      timeZone: idSchema,
    })
    .refine((value) => value.endAt > value.startAt, {
      path: ['endAt'],
      message: 'endAt must be after startAt.',
    }),
  createBaseSchema
    .extend({
      allDay: z.literal(true),
      startDate: dateOnlySchema,
      endDate: dateOnlySchema,
      calendarTimeZone: idSchema.optional(),
    })
    .refine((value) => value.endDate > value.startDate, {
      path: ['endDate'],
      message: 'endDate must be after startDate.',
    }),
])

export const updateEventBodySchema = z
  .strictObject({
    calendarId: idSchema.optional(),
    title: z.string().trim().min(1).max(240).optional(),
    description: z.string().max(10_000).optional().nullable(),
    location: z.string().trim().max(1000).optional().nullable(),
    status: workEventStatusSchema.optional(),
    busyStatus: workEventBusyStatusSchema.optional(),
    allDay: z.boolean().optional(),
    startAt: z.number().int().optional().nullable(),
    endAt: z.number().int().optional().nullable(),
    timeZone: idSchema.optional().nullable(),
    startDate: dateOnlySchema.optional().nullable(),
    endDate: dateOnlySchema.optional().nullable(),
    recurrenceRuleId: idSchema.optional().nullable(),
    recurrenceId: idSchema.optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const createParticipantBodySchema = createWorkEventParticipantInputSchema
export const updateParticipantBodySchema = updateWorkEventParticipantInputSchema

export const deleteEventBodySchema = z.strictObject({
  deletedBy: idSchema,
})
