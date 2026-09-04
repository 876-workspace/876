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

export const customFieldInputSchema = z.strictObject({
  key: keySchema,
  label: z.string().trim().min(1).max(100),
  fieldType: customFieldTypeSchema,
  options: z
    .array(
      z.strictObject({
        key: keySchema,
        label: z.string().trim().min(1).max(100),
      })
    )
    .optional(),
  required: z.boolean().optional(),
  description: nullableDescriptionSchema,
  position: positionSchema,
  typeIds: z.array(z.string().trim().min(1)).optional(),
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
export const updateCustomFieldInputSchema = customFieldInputSchema
  .omit({ key: true })
  .partial()
  .refine((input) => Object.keys(input).length > 0)
