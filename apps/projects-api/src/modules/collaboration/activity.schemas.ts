import { z } from 'zod'

export const projectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const activityQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
})

export type ActivityQuery = z.infer<typeof activityQuerySchema>
