import { z } from 'zod'

import {
  createListSchema,
  milestoneSchema,
  type CreateMilestoneInput,
  type SetCustomFieldValueInput,
  type UpdateMilestoneInput,
} from './types'

export const milestoneDetailSchema = milestoneSchema.extend({
  ownerUserId: z.string().nullable(),
})
export type MilestoneDetail = z.infer<typeof milestoneDetailSchema>
export const milestoneDetailListSchema = createListSchema(milestoneDetailSchema)

export const milestoneSummarySchema = z.object({
  object: z.literal('projects.milestone-summary'),
  milestoneId: z.string(),
  issueCount: z.number().int().nonnegative(),
  completedIssueCount: z.number().int().nonnegative(),
  progressPercent: z.number().int().min(0).max(100),
})
export type MilestoneSummary = z.infer<typeof milestoneSummarySchema>

export const milestoneCommentSchema = z.object({
  object: z.literal('projects.milestone-comment'),
  id: z.string(),
  milestoneId: z.string(),
  authorUserId: z.string().nullable(),
  body: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type MilestoneComment = z.infer<typeof milestoneCommentSchema>
export const milestoneCommentListSchema = createListSchema(milestoneCommentSchema)

export const milestoneEventSchema = z.object({
  object: z.literal('projects.milestone-event'),
  id: z.string(),
  milestoneId: z.string(),
  actorUserId: z.string().nullable(),
  type: z.string(),
  fromValue: z.string().nullable(),
  toValue: z.string().nullable(),
  createdAt: z.number(),
})
export type MilestoneEvent = z.infer<typeof milestoneEventSchema>
export const milestoneEventListSchema = createListSchema(milestoneEventSchema)

export const milestoneCustomFieldSchema = z.object({
  object: z.literal('projects.milestone-custom-field'),
  id: z.string(),
  tenantId: z.string(),
  key: z.string(),
  label: z.string(),
  fieldType: z.string(),
  options: z.unknown(),
  required: z.boolean(),
  description: z.string().nullable(),
  position: z.number(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type MilestoneCustomField = z.infer<typeof milestoneCustomFieldSchema>
export const milestoneCustomFieldListSchema = createListSchema(
  milestoneCustomFieldSchema
)

export const milestoneCustomFieldValueSchema = z.object({
  object: z.literal('projects.milestone-custom-field-value'),
  id: z.string(),
  milestoneId: z.string(),
  fieldId: z.string(),
  fieldKey: z.string(),
  fieldType: z.string(),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
  updatedBy: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type MilestoneCustomFieldValue = z.infer<
  typeof milestoneCustomFieldValueSchema
>
export const milestoneCustomFieldValueListSchema = createListSchema(
  milestoneCustomFieldValueSchema
)

export type CreateMilestoneWithActorInput = CreateMilestoneInput & {
  ownerUserId?: string | null
  actorUserId?: string | null
}
export type UpdateMilestoneWithActorInput = UpdateMilestoneInput & {
  ownerUserId?: string | null
  actorUserId?: string | null
}
export type CloneMilestoneInput = {
  key: string
  name: string
  actorUserId?: string | null
}
export type CreateMilestoneCommentInput = {
  body: string
  authorUserId: string
}
export type UpdateMilestoneCommentInput = {
  body: string
  actorUserId: string
}
export type CreateMilestoneCustomFieldInput = {
  key: string
  label: string
  fieldType:
    | 'text'
    | 'textarea'
    | 'number'
    | 'decimal'
    | 'boolean'
    | 'date'
    | 'select'
    | 'multi-select'
    | 'user'
    | 'url'
  options?: Array<{ key: string; label: string }>
  required?: boolean
  description?: string | null
  position?: number
}
export type UpdateMilestoneCustomFieldInput = Omit<
  Partial<CreateMilestoneCustomFieldInput>,
  'key'
>
export type SetMilestoneCustomFieldsInput = {
  customFields: SetCustomFieldValueInput[]
  updatedBy?: string | null
}
