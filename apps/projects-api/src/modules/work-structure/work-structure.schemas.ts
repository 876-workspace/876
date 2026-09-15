import { z } from 'zod'

const kebabKeySchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const hierarchyLevelSchema = z.number().int().min(0).max(2)
const nonEmptyUpdate = (data: Record<string, unknown>) =>
  Object.keys(data).length > 0

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
export const customFieldScopeSchema = z.enum(['work-item', 'phase'])
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

const workItemTypeMutableFields = {
  name: z.string().trim().min(1).max(100),
  iconKey: z.string().trim().min(1).max(100),
  color: z.string().trim().min(1).max(32),
  hierarchyLevel: hierarchyLevelSchema,
  description: z.string().trim().nullable(),
  isDefault: z.boolean(),
  position: z.number().int(),
}

export const createWorkItemTypeBodySchema = z.strictObject({
  key: kebabKeySchema,
  name: workItemTypeMutableFields.name,
  iconKey: workItemTypeMutableFields.iconKey,
  color: workItemTypeMutableFields.color,
  hierarchyLevel: hierarchyLevelSchema.default(1),
  description: workItemTypeMutableFields.description.optional(),
  isDefault: workItemTypeMutableFields.isDefault.optional(),
  position: workItemTypeMutableFields.position.optional(),
})
export const updateWorkItemTypeBodySchema = z
  .strictObject({
    name: workItemTypeMutableFields.name.optional(),
    iconKey: workItemTypeMutableFields.iconKey.optional(),
    color: workItemTypeMutableFields.color.optional(),
    hierarchyLevel: hierarchyLevelSchema.optional(),
    description: workItemTypeMutableFields.description.optional(),
    isDefault: workItemTypeMutableFields.isDefault.optional(),
    position: workItemTypeMutableFields.position.optional(),
  })
  .refine(nonEmptyUpdate)

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
  .refine(nonEmptyUpdate)
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
  ownerUserId: z.string().trim().min(1).nullable().optional(),
  startDate: z.number().int().nullable().optional(),
  targetDate: z.number().int().nullable().optional(),
  position: z.number().int().optional(),
})
export const updateMilestoneBodySchema = createMilestoneBodySchema
  .omit({ projectId: true, key: true })
  .partial()
  .refine(nonEmptyUpdate)
export const customFieldOptionSchema = z.strictObject({
  key: kebabKeySchema,
  label: z.string().trim().min(1).max(100),
})

const customFieldMutableFields = {
  label: z.string().trim().min(1).max(100),
  scope: customFieldScopeSchema,
  fieldType: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema),
  required: z.boolean(),
  description: z.string().trim().nullable(),
  position: z.number().int(),
  typeIds: z.array(z.string().trim().min(1)),
}

function validateOptionKeys(
  options: Array<{ key: string; label: string }> | undefined,
  ctx: z.RefinementCtx
) {
  if (!options) return
  const keys = options.map((option) => option.key)
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['options'],
      message: 'Custom field option keys must be unique.',
    })
  }
}

export const createCustomFieldBodySchema = z
  .strictObject({
    key: kebabKeySchema,
    label: customFieldMutableFields.label,
    scope: customFieldMutableFields.scope.optional(),
    fieldType: customFieldMutableFields.fieldType,
    options: customFieldMutableFields.options.optional(),
    required: customFieldMutableFields.required.optional(),
    description: customFieldMutableFields.description.optional(),
    position: customFieldMutableFields.position.optional(),
    typeIds: customFieldMutableFields.typeIds.optional(),
  })
  .superRefine((data, ctx) => {
    const optionField =
      data.fieldType === 'select' || data.fieldType === 'multi-select'
    if (optionField && (!data.options || data.options.length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Select fields require at least one option.',
      })
    }
    if (!optionField && data.options !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: 'Options are only valid for select fields.',
      })
    }
    if (data.scope === 'phase' && data.typeIds && data.typeIds.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['typeIds'],
        message: 'Phase fields cannot be assigned to work item types.',
      })
    }
    validateOptionKeys(data.options, ctx)
  })

export const updateCustomFieldBodySchema = z
  .strictObject({
    label: customFieldMutableFields.label.optional(),
    fieldType: customFieldMutableFields.fieldType.optional(),
    options: customFieldMutableFields.options.optional(),
    required: customFieldMutableFields.required.optional(),
    description: customFieldMutableFields.description.optional(),
    position: customFieldMutableFields.position.optional(),
    typeIds: customFieldMutableFields.typeIds.optional(),
  })
  .refine(nonEmptyUpdate)
  .superRefine((data, ctx) => validateOptionKeys(data.options, ctx))

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
