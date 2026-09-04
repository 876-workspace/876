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
