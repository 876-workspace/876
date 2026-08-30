import { createWorkTaskInputSchema, updateWorkTaskInputSchema } from '@876/work'
import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const taskParamsSchema = organizationParamsSchema.extend({
  taskId: z.string().trim().min(1),
})

export const listTasksQuerySchema = z
  .strictObject({
    context_service: z.string().trim().min(1).optional(),
    context_resource: z.string().trim().min(1).optional(),
    context_id: z.string().trim().min(1).optional(),
    priority_id: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    const parts = [
      value.context_service,
      value.context_resource,
      value.context_id,
    ]
    const count = parts.filter(Boolean).length
    if (count !== 0 && count !== 3)
      context.addIssue({
        code: 'custom',
        message: 'Context service, resource, and id must be supplied together.',
      })
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })

export const createTaskBodySchema = createWorkTaskInputSchema
export const updateTaskBodySchema = updateWorkTaskInputSchema
export const deleteTaskBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
