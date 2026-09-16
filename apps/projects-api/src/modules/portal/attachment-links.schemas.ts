import { z } from 'zod'

export const attachmentParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  attachmentId: z.string().trim().min(1),
})

export const listAttachmentsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
  issueId: z.string().trim().min(1).optional(),
  milestoneId: z.string().trim().min(1).optional(),
})

export const createAttachmentBodySchema = z.strictObject({
  url: z.string().trim().min(1).max(2000),
  name: z.string().trim().min(1).max(300).optional(),
  issueId: z.string().trim().min(1).nullable().optional(),
  milestoneId: z.string().trim().min(1).nullable().optional(),
  createdBy: z.string().trim().min(1).optional(),
})

export const updateAttachmentBodySchema = z
  .strictObject({
    url: z.string().trim().min(1).max(2000).optional(),
    name: z.string().trim().min(1).max(300).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  })

export const attachmentVisibilityBodySchema = z.strictObject({
  clientVisible: z.boolean(),
})

export type ListAttachmentsQuery = z.infer<typeof listAttachmentsQuerySchema>
export type CreateAttachmentBody = z.infer<typeof createAttachmentBodySchema>
export type UpdateAttachmentBody = z.infer<typeof updateAttachmentBodySchema>
