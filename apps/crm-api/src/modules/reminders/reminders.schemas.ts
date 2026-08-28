import { z } from 'zod'

const unixSecondsSchema = z.number().int()

export const requestParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const reminderParamsSchema = requestParamsSchema.extend({
  reminderId: z.string().trim().min(1),
})

export const createReminderBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(240),
  note: z.string().trim().max(10_000).nullable().optional(),
  remindAt: unixSecondsSchema,
  userId: z.string().trim().min(1),
  status: z.enum(['SCHEDULED', 'SENT', 'DISMISSED', 'CANCELLED']).optional(),
  createdBy: z.string().trim().min(1),
})

export const updateReminderBodySchema = createReminderBodySchema
  .omit({ createdBy: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const deleteReminderBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
