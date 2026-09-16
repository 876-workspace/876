import { z } from 'zod'

export const baselineProjectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const baselineParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  baselineId: z.string().trim().min(1),
})

export const baselineComparisonParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  baselineId: z.string().trim().min(1),
})

export const createBaselineBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  note: z.string().trim().max(2000).nullable().optional(),
  capturedBy: z.string().trim().min(1).nullable().optional(),
})

export type CreateBaselineBody = z.infer<typeof createBaselineBodySchema>
