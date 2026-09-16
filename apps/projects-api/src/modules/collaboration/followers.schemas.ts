import { z } from 'zod'

export const followSubjectTypeSchema = z.enum(['project', 'phase', 'work-item'])

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const followBodySchema = z.strictObject({
  subjectType: followSubjectTypeSchema,
  subjectId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
})

export const unfollowQuerySchema = z.strictObject({
  subjectType: followSubjectTypeSchema,
  subjectId: z.string().trim().min(1),
  userId: z.string().trim().min(1),
})

export const listFollowersQuerySchema = z.strictObject({
  subjectType: followSubjectTypeSchema,
  subjectId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
})

export type FollowBody = z.infer<typeof followBodySchema>
export type UnfollowQuery = z.infer<typeof unfollowQuerySchema>
export type ListFollowersQuery = z.infer<typeof listFollowersQuerySchema>
export type FollowSubjectType = z.infer<typeof followSubjectTypeSchema>
