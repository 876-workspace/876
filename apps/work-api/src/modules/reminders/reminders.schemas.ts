import {
  createWorkReminderInputSchema,
  updateWorkReminderInputSchema,
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
  })
  .superRefine((value, context) => {
    const parts = [value.context_service, value.context_resource, value.context_id]
    const count = parts.filter(Boolean).length
    if (count !== 0 && count !== 3)
      context.addIssue({
        code: 'custom',
        message: 'Context service, resource, and id must be supplied together.',
      })
  })

export const createReminderBodySchema = createWorkReminderInputSchema
export const updateReminderBodySchema = updateWorkReminderInputSchema
export const deleteReminderBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
