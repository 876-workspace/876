import { z } from 'zod'

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const projectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const discussionParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  discussionId: z.string().trim().min(1),
})

export const postParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  discussionId: z.string().trim().min(1),
  postId: z.string().trim().min(1),
})

export const listDiscussionsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
  include_deleted: z.enum(['true', 'false']).optional(),
})

export const listPostsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
})

export const createDiscussionBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(20000),
  authorUserId: z.string().trim().min(1).optional(),
  pinned: z.boolean().optional(),
})

export const updateDiscussionBodySchema = z
  .strictObject({
    title: z.string().trim().min(1).max(300).optional(),
    body: z.string().trim().min(1).max(20000).optional(),
    pinned: z.boolean().optional(),
    locked: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  })

export const createPostBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(20000),
  authorUserId: z.string().trim().min(1).optional(),
})

export const updatePostBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(20000),
  authorUserId: z.string().trim().min(1),
})

export const visibilityBodySchema = z.strictObject({
  clientVisible: z.boolean(),
})

export type ListDiscussionsQuery = z.infer<typeof listDiscussionsQuerySchema>
export type ListPostsQuery = z.infer<typeof listPostsQuerySchema>
export type CreateDiscussionBody = z.infer<typeof createDiscussionBodySchema>
export type UpdateDiscussionBody = z.infer<typeof updateDiscussionBodySchema>
export type CreatePostBody = z.infer<typeof createPostBodySchema>
export type UpdatePostBody = z.infer<typeof updatePostBodySchema>
export type VisibilityBody = z.infer<typeof visibilityBodySchema>
