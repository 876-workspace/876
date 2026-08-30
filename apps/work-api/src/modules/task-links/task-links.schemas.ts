import { createWorkTaskLinkInputSchema } from '@876/work'
import { z } from 'zod'

export const taskParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  taskId: z.string().trim().min(1),
})
export const taskLinkParamsSchema = taskParamsSchema.extend({
  linkId: z.string().trim().min(1),
})
export const createTaskLinkBodySchema = createWorkTaskLinkInputSchema
