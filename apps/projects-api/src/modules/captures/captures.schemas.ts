import { z } from 'zod'

export const captureStatusSchema = z.enum(['inbox', 'promoted', 'discarded'])
export const captureSourceSchema = z.enum(['mcp', 'web', 'mobile'])

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const captureParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  captureId: z.string().trim().min(1),
})
export const listCapturesQuerySchema = z.strictObject({
  status: captureStatusSchema.optional(),
})
export const createCaptureBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().nullable().optional(),
  projectId: z.string().trim().min(1).nullable().optional(),
  source: captureSourceSchema.optional(),
  createdBy: z.string().trim().min(1),
})
export const updateCaptureBodySchema = z
  .strictObject({
    title: z.string().trim().min(1).max(300).optional(),
    body: z.string().trim().nullable().optional(),
    projectId: z.string().trim().min(1).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided for update',
  })
export const promoteCaptureBodySchema = z.strictObject({
  projectId: z.string().trim().min(1),
  typeKey: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  creatorUserId: z.string().trim().nullable().optional(),
})
export type CreateCaptureBody = z.infer<typeof createCaptureBodySchema>
export type UpdateCaptureBody = z.infer<typeof updateCaptureBodySchema>
export type PromoteCaptureBody = z.infer<typeof promoteCaptureBodySchema>
