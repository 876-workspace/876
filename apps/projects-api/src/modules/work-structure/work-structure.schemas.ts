import { z } from 'zod'

const kebabKeySchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
export const workflowCategorySchema = z.enum([
  'backlog',
  'unstarted',
  'started',
  'completed',
  'canceled',
])
export const customFieldTypeSchema = z.enum([
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
export const milestoneStatusSchema = z.enum(['open', 'completed', 'canceled'])
export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})
export const resourceParamsSchema = organizationParamsSchema.extend({
  id: z.string().trim().min(1),
})
export const issueParamsSchema = organizationParamsSchema.extend({
  issueRef: z.string().trim().min(1),
})
export const customFieldValueParamsSchema = issueParamsSchema.extend({
  id: z.string().trim().min(1),
})

export const createWorkItemTypeBodySchema = z.strictObject({
  key: kebabKeySchema,
  name: z.string().trim().min(1).max(100),
  iconKey: z.string().trim().min(1).max(100),
  color: z.string().trim().min(1).max(32),
  hierarchyLevel: z.number().int().min(0).max(2).default(1),
  description: z.string().trim().nullable().optional(),
  isDefault: z.boolean().optional(),
  position: z.number().int().optional(),
})
export const updateWorkItemTypeBodySchema = createWorkItemTypeBodySchema
  .omit({ key: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0)
export const createWorkflowStateBodySchema = z.strictObject({
  key: kebabKeySchema,
  name: z.string().trim().min(1).max(100),
  category: workflowCategorySchema,
  color: z.string().trim().min(1).max(32),
  description: z.string().trim().nullable().optional(),
  isDefault: z.boolean().optional(),
  position: z.number().int().optional(),
})
export const updateWorkflowStateBodySchema = createWorkflowStateBodySchema
  .omit({ key: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0)
export const milestoneListQuerySchema = z.strictObject({
  projectId: z.string().trim().min(1),
  status: milestoneStatusSchema.optional(),
})
export const createMilestoneBodySchema = z.strictObject({
  projectId: z.string().trim().min(1),
  key: kebabKeySchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().nullable().optional(),
  status: milestoneStatusSchema.optional(),
  startDate: z.number().int().nullable().optional(),
  targetDate: z.number().int().nullable().optional(),
  position: z.number().int().optional(),
})
export const updateMilestoneBodySchema = createMilestoneBodySchema
  .omit({ projectId: true, key: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0)
export const customFieldOptionSchema = z.strictObject({
  key: kebabKeySchema,
  label: z.string().trim().min(1).max(100),
})
export const createCustomFieldBodySchema = z.strictObject({
  key: kebabKeySchema,
  label: z.string().trim().min(1).max(100),
  fieldType: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema).optional(),
  required: z.boolean().optional(),
  description: z.string().trim().nullable().optional(),
  position: z.number().int().optional(),
  typeIds: z.array(z.string().trim().min(1)).optional(),
})
export const updateCustomFieldBodySchema = createCustomFieldBodySchema
  .omit({ key: true })
  .partial()
  .refine((data) => Object.keys(data).length > 0)
export const customFieldValueInputSchema = z.strictObject({
  fieldId: z.string().trim().min(1),
  value: z.union([
    z.string(),
    z.number().int(),
    z.boolean(),
    z.array(z.string().trim().min(1)),
    z.null(),
  ]),
})
export const setCustomFieldValueBodySchema = customFieldValueInputSchema.extend(
  { updatedBy: z.string().trim().nullable().optional() }
)
export const setCustomFieldsBodySchema = z.strictObject({
  customFields: z.array(customFieldValueInputSchema),
  updatedBy: z.string().trim().nullable().optional(),
})
export const applyPresetBodySchema = z.strictObject({
  key: z.enum(['software-development', 'business-operations', 'general']),
})

export type CreateWorkItemTypeBody = z.infer<
  typeof createWorkItemTypeBodySchema
>
export type UpdateWorkItemTypeBody = z.infer<
  typeof updateWorkItemTypeBodySchema
>
export type CreateWorkflowStateBody = z.infer<
  typeof createWorkflowStateBodySchema
>
export type UpdateWorkflowStateBody = z.infer<
  typeof updateWorkflowStateBodySchema
>
export type CreateMilestoneBody = z.infer<typeof createMilestoneBodySchema>
export type UpdateMilestoneBody = z.infer<typeof updateMilestoneBodySchema>
export type CreateCustomFieldBody = z.infer<typeof createCustomFieldBodySchema>
export type UpdateCustomFieldBody = z.infer<typeof updateCustomFieldBodySchema>
export type CustomFieldValueInput = z.infer<typeof customFieldValueInputSchema>
