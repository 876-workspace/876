import { z } from 'zod'

import { optionalRichContentSchema } from '../../types/rich-content.js'

const unixSecondsSchema = z.number().int()

export const requestParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const taskParamsSchema = requestParamsSchema.extend({
  taskId: z.string().trim().min(1),
})

export const createTaskBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(240),
  description: optionalRichContentSchema(10_000),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']).optional(),
  priorityId: z.string().trim().min(1).optional(),
  assigneeId: z.string().trim().min(1).nullable().optional(),
  dueAt: unixSecondsSchema.nullable().optional(),
  sortOrder: z.number().int().optional(),
  createdBy: z.string().trim().min(1),
})

export const updateTaskBodySchema = createTaskBodySchema
  .omit({ createdBy: true })
  .extend({ completedBy: z.string().trim().min(1).nullable().optional() })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const deleteTaskBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
