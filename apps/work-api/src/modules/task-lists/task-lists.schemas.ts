import {
  createWorkTaskListInputSchema,
  updateWorkTaskListInputSchema,
} from '@876/work'
import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const taskListParamsSchema = organizationParamsSchema.extend({
  listId: z.string().trim().min(1),
})
export const listTaskListsQuerySchema = z
  .strictObject({
    owner_user_id: z.string().trim().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })
export const createTaskListBodySchema = createWorkTaskListInputSchema
export const updateTaskListBodySchema = updateWorkTaskListInputSchema
export const deleteTaskListBodySchema = z.strictObject({
  deletedBy: z.string().trim().min(1),
})
