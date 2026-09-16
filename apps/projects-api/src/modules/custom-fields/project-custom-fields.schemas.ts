import { z } from 'zod'

import {
  customFieldOptionSchema,
  customFieldTypeSchema,
  customFieldValueInputSchema,
} from '../work-structure/work-structure.schemas.js'

const kebabKeySchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const nonEmptyUpdate = (data: Record<string, unknown>) =>
  Object.keys(data).length > 0

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const projectFieldParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  fieldId: z.string().trim().min(1),
})

export const projectValuesParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
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

export const createProjectCustomFieldBodySchema = z
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

export const updateProjectCustomFieldBodySchema = z
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

export const setProjectCustomFieldValuesBodySchema = z.strictObject({
  customFields: z.array(customFieldValueInputSchema),
  updatedBy: z.string().trim().min(1).nullable().optional(),
})

export type CreateProjectCustomFieldBody = z.infer<
  typeof createProjectCustomFieldBodySchema
>
export type UpdateProjectCustomFieldBody = z.infer<
  typeof updateProjectCustomFieldBodySchema
>
export type SetProjectCustomFieldValuesBody = z.infer<
  typeof setProjectCustomFieldValuesBodySchema
>
