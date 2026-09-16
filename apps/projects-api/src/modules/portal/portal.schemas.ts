import { z } from 'zod'

export const portalParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const portalIssueParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  issueRef: z.string().trim().min(1),
})

export const portalMilestoneParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  milestoneId: z.string().trim().min(1),
})

export const portalDiscussionParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  discussionId: z.string().trim().min(1),
})

export const portalPageParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  pageRef: z.string().trim().min(1),
})

export const portalListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
})

export const portalActivityQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().trim().min(1).optional(),
})

export type PortalListQuery = z.infer<typeof portalListQuerySchema>
export type PortalActivityQuery = z.infer<typeof portalActivityQuerySchema>

export const portalCreateCommentBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(10000),
})

export type PortalCreateCommentBody = z.infer<
  typeof portalCreateCommentBodySchema
>

export const portalCreateDiscussionPostBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(20000),
})

export type PortalCreateDiscussionPostBody = z.infer<
  typeof portalCreateDiscussionPostBodySchema
>
