import { z } from 'zod'

const keySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const nullableDescriptionSchema = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
const positionSchema = z.number().int().min(0).optional()

export const workItemTypeInputSchema = z.strictObject({
  key: keySchema,
  name: z.string().trim().min(1).max(100),
  iconKey: z.string().trim().min(1).max(100),
  color: z.string().trim().min(1).max(32),
  hierarchyLevel: z.number().int().min(0).max(2).optional(),
  description: nullableDescriptionSchema,
  isDefault: z.boolean().optional(),
  position: positionSchema,
})

export const workflowStateInputSchema = z.strictObject({
  key: keySchema,
  name: z.string().trim().min(1).max(100),
  category: z.enum([
    'backlog',
    'unstarted',
    'started',
    'completed',
    'canceled',
  ]),
  color: z.string().trim().min(1).max(32),
  description: nullableDescriptionSchema,
  isDefault: z.boolean().optional(),
  position: positionSchema,
})

export const milestoneInputSchema = z.strictObject({
  projectId: z.string().trim().min(1),
  key: keySchema,
  name: z.string().trim().min(1).max(100),
  description: nullableDescriptionSchema,
  status: z.enum(['open', 'completed', 'canceled']).optional(),
  startDate: z.number().int().nullable().optional(),
  targetDate: z.number().int().nullable().optional(),
  position: positionSchema,
})

const customFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'decimal',
  'boolean',
  'date',
  'select',
  'multi-select',
  'user',
  'url',
])
const customFieldOptionsSchema = z.array(
  z.strictObject({
    key: keySchema,
    label: z.string().trim().min(1).max(100),
  })
)

function validateOptions(
  data: { fieldType?: string; options?: Array<{ key: string; label: string }> },
  ctx: z.RefinementCtx
) {
  const optionField =
    data.fieldType === 'select' || data.fieldType === 'multi-select'
  if (optionField && (!data.options || data.options.length === 0)) {
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Select fields require at least one option.',
    })
  }
  if (data.options) {
    const keys = data.options.map((option) => option.key)
    if (new Set(keys).size !== keys.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Custom field option keys must be unique.',
      })
    }
  }
}

export const customFieldInputSchema = z
  .strictObject({
    key: keySchema,
    label: z.string().trim().min(1).max(100),
    fieldType: customFieldTypeSchema,
    options: customFieldOptionsSchema.optional(),
    required: z.boolean().optional(),
    description: nullableDescriptionSchema,
    position: positionSchema,
    typeIds: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((data, ctx) => {
    validateOptions(data, ctx)
    const optionField =
      data.fieldType === 'select' || data.fieldType === 'multi-select'
    if (!optionField && data.options !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Options are only valid for select fields.',
      })
    }
  })

export const updateWorkItemTypeInputSchema = workItemTypeInputSchema
  .omit({ key: true })
  .partial()
  .refine((input) => Object.keys(input).length > 0)
export const updateWorkflowStateInputSchema = workflowStateInputSchema
  .omit({ key: true })
  .partial()
  .refine((input) => Object.keys(input).length > 0)
export const updateMilestoneInputSchema = milestoneInputSchema
  .omit({ projectId: true, key: true })
  .partial()
  .refine((input) => Object.keys(input).length > 0)
export const updateCustomFieldInputSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(100).optional(),
    fieldType: customFieldTypeSchema.optional(),
    options: customFieldOptionsSchema.optional(),
    required: z.boolean().optional(),
    description: nullableDescriptionSchema,
    position: positionSchema,
    typeIds: z.array(z.string().trim().min(1)).optional(),
  })
  .refine((input) => Object.keys(input).length > 0)
  .superRefine((data, ctx) => validateOptions(data, ctx))

const phaseKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)

const phaseFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'decimal',
  'boolean',
  'date',
  'select',
  'multi-select',
  'user',
  'url',
])

const phaseOptionSchema = z.strictObject({
  key: phaseKeySchema,
  label: z.string().trim().min(1).max(100),
})

function phaseValidateOptions(
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
  const select =
    data.fieldType === 'select' || data.fieldType === 'multi-select'
  if (select && (!data.options || data.options.length === 0))
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Select fields require at least one option.',
    })
  if (!select && data.options !== undefined)
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are only valid for select fields.',
    })
}

export const phaseCustomFieldInputSchema = z
  .strictObject({
    key: phaseKeySchema,
    label: z.string().trim().min(1).max(100),
    fieldType: phaseFieldTypeSchema,
    options: z.array(phaseOptionSchema).optional(),
    required: z.boolean().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .superRefine(phaseValidateOptions)

export const updatePhaseCustomFieldInputSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(100).optional(),
    fieldType: phaseFieldTypeSchema.optional(),
    options: z.array(phaseOptionSchema).optional(),
    required: z.boolean().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((input) => Object.keys(input).length > 0)
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

const projectKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)

const projectFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'decimal',
  'boolean',
  'date',
  'select',
  'multi-select',
  'user',
  'url',
])

const projectOptionSchema = z.strictObject({
  key: projectKeySchema,
  label: z.string().trim().min(1).max(100),
})

function projectValidateOptions(
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
  const select =
    data.fieldType === 'select' || data.fieldType === 'multi-select'
  if (select && (!data.options || data.options.length === 0))
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Select fields require at least one option.',
    })
  if (!select && data.options !== undefined)
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Options are only valid for select fields.',
    })
}

export const projectCustomFieldInputSchema = z
  .strictObject({
    key: projectKeySchema,
    label: z.string().trim().min(1).max(100),
    fieldType: projectFieldTypeSchema,
    options: z.array(projectOptionSchema).optional(),
    required: z.boolean().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .superRefine(projectValidateOptions)

export const updateProjectCustomFieldInputSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(100).optional(),
    fieldType: projectFieldTypeSchema.optional(),
    options: z.array(projectOptionSchema).optional(),
    required: z.boolean().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((input) => Object.keys(input).length > 0)
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

export const projectCustomFieldValuesInputSchema = z.strictObject({
  customFields: z.array(
    z.strictObject({
      fieldId: z.string().trim().min(1),
      value: z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string().trim().min(1)),
        z.null(),
      ]),
    })
  ),
})

export interface BlueprintTransitionDto {
  id: string | null
  fromStateKey: string | null
  toStateKey: string
  name: string
  requiredPermission: string | null
  requiredFieldKeys: string[]
  requiresComment: boolean
}

export interface WorkflowBlueprintDto {
  object: string
  workItemTypeId: string
  updatedAt: number | null
  transitions: BlueprintTransitionDto[]
}

export interface BlueprintTransitionInput {
  fromStateKey?: string | null
  toStateKey: string
  name: string
  requiredPermission?: string | null
  requiredFieldKeys?: string[]
  requiresComment?: boolean
}

export type CreateBaselineParams = {
  name: string
  note?: string | null
}
