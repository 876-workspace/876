import { z } from 'zod'

import {
  createMilestoneBodySchema,
  customFieldOptionSchema,
  customFieldTypeSchema,
  customFieldValueInputSchema,
  updateMilestoneBodySchema,
} from './work-structure.schemas.js'

const kebabKeySchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const nonEmptyUpdate = (data: Record<string, unknown>) =>
  Object.keys(data).length > 0
const actorUserIdSchema = z.string().trim().min(1).nullable().optional()

export const milestoneDetailParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const milestoneCommentParamsSchema = milestoneDetailParamsSchema.extend({
  commentId: z.string().trim().min(1),
})

export const milestoneFieldParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  fieldId: z.string().trim().min(1),
})

export const createMilestoneWithActorBodySchema = createMilestoneBodySchema.extend({
  actorUserId: actorUserIdSchema,
})
export const updateMilestoneWithActorBodySchema = updateMilestoneBodySchema.and(
  z.strictObject({ actorUserId: actorUserIdSchema })
)

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

const fieldMutableFields = {
  label: z.string().trim().min(1).max(100),
  fieldType: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema),
  required: z.boolean(),
  description: z.string().trim().nullable(),
  position: z.number().int(),
}

function validateFieldOptions(
  data: { fieldType?: string; options?: Array<{ key: string; label: string }> },
  ctx: z.RefinementCtx
) {
  if (data.options) {
    const keys = data.options.map((option) => option.key)
    if (new Set(keys).size !== keys.length)
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Custom field option keys must be unique.',
      })
  }
  if (!data.fieldType) return
  const optionField =
    data.fieldType === 'select' || data.fieldType === 'multi-select'
  if (optionField && (!data.options || data.options.length === 0))
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Select fields require at least one option.',
    })
  if (!optionField && data.options !== undefined)
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are only valid for select fields.',
    })
}

export const createMilestoneCustomFieldBodySchema = z
  .strictObject({
    key: kebabKeySchema,
    label: fieldMutableFields.label,
    fieldType: fieldMutableFields.fieldType,
    options: fieldMutableFields.options.optional(),
    required: fieldMutableFields.required.optional(),
    description: fieldMutableFields.description.optional(),
    position: fieldMutableFields.position.optional(),
  })
  .superRefine(validateFieldOptions)

export const updateMilestoneCustomFieldBodySchema = z
  .strictObject({
    label: fieldMutableFields.label.optional(),
    fieldType: fieldMutableFields.fieldType.optional(),
    options: fieldMutableFields.options.optional(),
    required: fieldMutableFields.required.optional(),
    description: fieldMutableFields.description.optional(),
    position: fieldMutableFields.position.optional(),
  })
  .refine(nonEmptyUpdate)
  .superRefine((data, ctx) => {
    if (data.options) {
      const keys = data.options.map((option) => option.key)
      if (new Set(keys).size !== keys.length)
        ctx.addIssue({
          code: 'custom',
          path: ['options'],
          message: 'Custom field option keys must be unique.',
        })
    }
  })

export const setMilestoneCustomFieldsBodySchema = z.strictObject({
  customFields: z.array(customFieldValueInputSchema),
  updatedBy: z.string().trim().min(1).nullable().optional(),
})

export const cloneMilestoneBodySchema = z.strictObject({
  key: kebabKeySchema,
  name: z.string().trim().min(1).max(100),
  actorUserId: actorUserIdSchema,
})

export type CreateMilestoneWithActorBody = z.infer<
  typeof createMilestoneWithActorBodySchema
>
export type UpdateMilestoneWithActorBody = z.infer<
  typeof updateMilestoneWithActorBodySchema
>
export type CreateMilestoneCustomFieldBody = z.infer<
  typeof createMilestoneCustomFieldBodySchema
>
export type UpdateMilestoneCustomFieldBody = z.infer<
  typeof updateMilestoneCustomFieldBodySchema
>
export type SetMilestoneCustomFieldsBody = z.infer<
  typeof setMilestoneCustomFieldsBodySchema
>
export type CloneMilestoneBody = z.infer<typeof cloneMilestoneBodySchema>
