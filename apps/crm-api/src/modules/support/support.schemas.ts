import { z } from 'zod'

export const listSupportRequestsQuerySchema = z.strictObject({
  sourceOrganizationId: z.string().trim().min(1).max(160),
})

export const createSupportRequestBodySchema = z.strictObject({
  sourceOrganizationId: z.string().trim().min(1).max(160),
  sourceOrganizationName: z.string().trim().min(1).max(160),
  requesterUserId: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(240),
  description: z.string().trim().max(20_000).nullable().optional(),
  categoryId: z.string().trim().max(160).nullable().optional(),
})

export type CreateSupportRequestInput = z.infer<
  typeof createSupportRequestBodySchema
>
