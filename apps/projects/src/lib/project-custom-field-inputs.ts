import { z } from 'zod'

const keySchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)

const fieldTypeSchema = z.enum([
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

const optionSchema = z.strictObject({
  key: keySchema,
  label: z.string().trim().min(1).max(100),
})

function validateOptions(
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
    key: keySchema,
    label: z.string().trim().min(1).max(100),
    fieldType: fieldTypeSchema,
    options: z.array(optionSchema).optional(),
    required: z.boolean().optional(),
    description: z.string().trim().max(500).nullable().optional(),
    position: z.number().int().min(0).optional(),
  })
  .superRefine(validateOptions)

export const updateProjectCustomFieldInputSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(100).optional(),
    fieldType: fieldTypeSchema.optional(),
    options: z.array(optionSchema).optional(),
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
