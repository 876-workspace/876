import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const issueParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  issueRef: z.string().trim().min(1),
})

export const commentParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  issueRef: z.string().trim().min(1),
  commentId: z.string().trim().min(1),
})

export const listCommentsQuerySchema = z
  .strictObject({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    starting_after: z.string().trim().min(1).optional(),
    ending_before: z.string().trim().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'starting_after and ending_before are mutually exclusive',
  })

export const createCommentBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(10000),
  authorUserId: z.string().trim().min(1).optional(),
})

export const updateCommentBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(10000),
})

export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>
export type UpdateCommentBody = z.infer<typeof updateCommentBodySchema>
