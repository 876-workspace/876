import {
  createWorkEventResourceInputSchema,
  updateWorkEventResourceInputSchema,
  workEventStatusSchema,
  workRecurrenceDraftSchema,
} from '@876/work'
import { z } from 'zod'

const contextShape = {
  context_service: z.string().trim().min(1).optional(),
  context_resource: z.string().trim().min(1).optional(),
  context_id: z.string().trim().min(1).optional(),
}

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const eventParamsSchema = organizationParamsSchema.extend({
  eventId: z.string().trim().min(1),
})
export const listEventsQuerySchema = z
  .strictObject({
    calendar_id: z.string().trim().min(1).optional(),
    ...contextShape,
    from: z.coerce.number().int().optional(),
    to: z.coerce.number().int().optional(),
    status: workEventStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .superRefine((query, context) => {
    const count = [
      query.context_service,
      query.context_resource,
      query.context_id,
    ].filter(Boolean).length
    if (count !== 0 && count !== 3)
      context.addIssue({
        code: 'custom',
        message: 'Context filters must be supplied together.',
      })
    if (query.starting_after && query.ending_before)
      context.addIssue({
        code: 'custom',
        message: 'Only one cursor may be provided.',
      })
    if (query.from && query.to && query.to <= query.from)
      context.addIssue({ code: 'custom', message: 'to must be after from.' })
  })

export const createEventBodySchema = createWorkEventResourceInputSchema
export const updateEventBodySchema = updateWorkEventResourceInputSchema
export const setEventRecurrenceBodySchema = workRecurrenceDraftSchema
export const deleteEventBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
