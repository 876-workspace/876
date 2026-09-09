import {
  createWorkReminderInputSchema,
  updateWorkReminderInputSchema,
  workRecurrenceDraftSchema,
  workReminderStatusSchema,
} from '@876/work'
import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const reminderParamsSchema = organizationParamsSchema.extend({
  reminderId: z.string().trim().min(1),
})
export const listRemindersQuerySchema = z
  .strictObject({
    context_service: z.string().trim().min(1).optional(),
    context_resource: z.string().trim().min(1).optional(),
    context_id: z.string().trim().min(1).optional(),
    user_id: z.string().trim().min(1).optional(),
    status: workReminderStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    const count = [
      value.context_service,
      value.context_resource,
      value.context_id,
    ].filter(Boolean).length
    if (count !== 0 && count !== 3)
      context.addIssue({
        code: 'custom',
        message: 'Context service, resource, and id must be supplied together.',
      })
    if (value.starting_after && value.ending_before)
      context.addIssue({
        code: 'custom',
        message: 'Only one cursor may be provided.',
      })
  })
export const createReminderBodySchema = createWorkReminderInputSchema
export const updateReminderBodySchema = updateWorkReminderInputSchema
export const setReminderRecurrenceBodySchema = workRecurrenceDraftSchema
export const deleteReminderBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
