import {
  createWorkTaskInputSchema,
  updateWorkTaskInputSchema,
  workTaskStatusSchema,
} from '@876/work'
import { z } from 'zod'

const contextQueryShape = {
  context_service: z.string().trim().min(1).optional(),
  context_resource: z.string().trim().min(1).optional(),
  context_id: z.string().trim().min(1).optional(),
}

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const taskParamsSchema = organizationParamsSchema.extend({
  taskId: z.string().trim().min(1),
})
export const listTasksQuerySchema = z
  .strictObject({
    ...contextQueryShape,
    list_id: z.string().trim().min(1).optional(),
    parent_task_id: z.string().optional(),
    priority_id: z.string().trim().min(1).optional(),
    assignee_id: z.string().trim().min(1).optional(),
    status: workTaskStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .superRefine((query, ctx) => {
    const contextCount = [query.context_service, query.context_resource, query.context_id].filter(Boolean).length
    if (contextCount !== 0 && contextCount !== 3)
      ctx.addIssue({ code: 'custom', message: 'Context filters must be supplied together.' })
    if (query.starting_after && query.ending_before)
      ctx.addIssue({ code: 'custom', message: 'Only one cursor may be provided.' })
  })
export const createTaskBodySchema = createWorkTaskInputSchema
export const updateTaskBodySchema = updateWorkTaskInputSchema
export const deleteTaskBodySchema = z.strictObject({ deletedBy: z.string().trim().min(1) })
