import { z } from 'zod'

import { customFieldValueInputSchema } from './work-structure.schemas.js'

export const milestoneDetailParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const milestoneCommentParamsSchema = milestoneDetailParamsSchema.extend({
  commentId: z.string().trim().min(1),
})

export const milestoneCommentBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(10_000),
  authorUserId: z.string().trim().min(1),
})

export const milestoneCommentUpdateBodySchema = z.strictObject({
  body: z.string().trim().min(1).max(10_000),
  actorUserId: z.string().trim().min(1),
})

export const milestoneCommentDeleteQuerySchema = z.strictObject({
  actorUserId: z.string().trim().min(1),
})

export const setMilestoneCustomFieldsBodySchema = z.strictObject({
  customFields: z.array(customFieldValueInputSchema),
  updatedBy: z.string().trim().min(1).nullable().optional(),
})

export const cloneMilestoneBodySchema = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(100),
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export type SetMilestoneCustomFieldsBody = z.infer<
  typeof setMilestoneCustomFieldsBodySchema
>
export type CloneMilestoneBody = z.infer<typeof cloneMilestoneBodySchema>
