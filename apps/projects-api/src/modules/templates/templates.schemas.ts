import { z } from 'zod'

export const DAY_SECONDS = 86400
export const TEMPLATE_SCHEMA_VERSION = 1 as const

const kebabKeySchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const templateKeySchema = kebabKeySchema
const refSchema = z.string().trim().min(1).max(80)
const offsetDaysSchema = z.number().int().min(-3650).max(36500)
const durationDaysSchema = z.number().int().min(0).max(36500)

export const templateIssuePrioritySchema = z.enum([
  'none',
  'low',
  'medium',
  'high',
  'urgent',
])

export const templateDependencyTypeSchema = z.enum([
  'finish-to-start',
  'start-to-start',
  'finish-to-finish',
  'start-to-finish',
])

export const templateCustomFieldTypeSchema = z.enum([
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

export const templateBudgetScopeSchema = z.enum(['project', 'milestone'])

export const templatePhaseSchema = z.strictObject({
  ref: refSchema,
  key: kebabKeySchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  startOffsetDays: offsetDaysSchema.optional(),
  durationDays: durationDaysSchema.nullable().optional(),
  position: z.number().int().optional(),
})

export const templateTaskListSchema = z.strictObject({
  ref: refSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  phaseRef: refSchema.nullable().optional(),
  startOffsetDays: offsetDaysSchema.optional(),
  durationDays: durationDaysSchema.nullable().optional(),
  position: z.number().int().optional(),
})

export const templateWorkItemSchema = z.strictObject({
  ref: refSchema,
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10000).nullable().optional(),
  typeKey: kebabKeySchema,
  stateKey: kebabKeySchema,
  priority: templateIssuePrioritySchema.optional(),
  estimate: z.number().int().min(0).max(100).nullable().optional(),
  labels: z.array(z.string().trim().min(1).max(100)).optional(),
  phaseRef: refSchema.nullable().optional(),
  taskListRef: refSchema.nullable().optional(),
  parentRef: refSchema.nullable().optional(),
  startOffsetDays: offsetDaysSchema.optional(),
  dueOffsetDays: offsetDaysSchema.optional(),
  durationDays: durationDaysSchema.nullable().optional(),
})

export const templateDependencySchema = z.strictObject({
  fromRef: refSchema,
  toRef: refSchema,
  type: templateDependencyTypeSchema.optional(),
  lagDays: z.number().int().min(0).max(36500).optional(),
})

export const templateCustomFieldOptionSchema = z.strictObject({
  key: kebabKeySchema,
  label: z.string().trim().min(1).max(100),
})

export const templateCustomFieldDefinitionSchema = z.strictObject({
  key: kebabKeySchema,
  label: z.string().trim().min(1).max(100),
  fieldType: templateCustomFieldTypeSchema,
  options: z.array(templateCustomFieldOptionSchema).optional(),
  required: z.boolean().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  typeKeys: z.array(kebabKeySchema).optional(),
})

export const templateBudgetDefaultSchema = z
  .strictObject({
    scope: templateBudgetScopeSchema,
    phaseRef: refSchema.nullable().optional(),
    amountMinor: z.number().int().positive().nullable().optional(),
    hours: z.number().int().positive().nullable().optional(),
    thresholdPercent: z.number().int().min(1).max(100).optional(),
    periodStartOffsetDays: offsetDaysSchema.nullable().optional(),
    periodEndOffsetDays: offsetDaysSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      ((data.amountMinor ?? null) !== null) !==
      ((data.hours ?? null) !== null),
    { message: 'Exactly one of amountMinor or hours must be set' },
  )
  .refine(
    (data) =>
      (data.scope === 'milestone' && (data.phaseRef ?? null) !== null) ||
      (data.scope !== 'milestone' && (data.phaseRef ?? null) == null),
    {
      message: 'phaseRef is required exactly when scope is milestone',
      path: ['phaseRef'],
    },
  )

const templateBillingMethodSchema = z.enum([
  'non-billable',
  'fixed-fee',
  'time-and-materials',
  'hourly',
  'phase-based',
])

export const templateProjectSettingsSchema = z
  .strictObject({
    description: z.string().trim().max(2000).nullable().optional(),
    status: z
      .enum(['planned', 'active', 'paused', 'completed', 'canceled'])
      .optional(),
    health: z.enum(['on-track', 'at-risk', 'off-track']).optional(),
    billingMethod: templateBillingMethodSchema.optional(),
    currency: z.string().trim().min(3).max(3).optional(),
    fixedFeeAmount: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (data) =>
      data.billingMethod !== 'fixed-fee' ||
      typeof data.fixedFeeAmount === 'number',
    {
      message: 'fixedFeeAmount is required when billingMethod is fixed-fee',
      path: ['fixedFeeAmount'],
    },
  )

export const templateDefinitionSchema = z.strictObject({
  schemaVersion: z.literal(TEMPLATE_SCHEMA_VERSION),
  project: templateProjectSettingsSchema.optional(),
  phases: z.array(templatePhaseSchema).max(500).optional(),
  taskLists: z.array(templateTaskListSchema).max(500).optional(),
  workItems: z.array(templateWorkItemSchema).max(2000).optional(),
  dependencies: z.array(templateDependencySchema).max(2000).optional(),
  customFieldDefinitions: z
    .array(templateCustomFieldDefinitionSchema)
    .max(200)
    .optional(),
  budgetDefaults: z.array(templateBudgetDefaultSchema).max(200).optional(),
})

export type TemplateDefinition = z.infer<typeof templateDefinitionSchema>
export type TemplatePhase = z.infer<typeof templatePhaseSchema>
export type TemplateTaskList = z.infer<typeof templateTaskListSchema>
export type TemplateWorkItem = z.infer<typeof templateWorkItemSchema>
export type TemplateDependency = z.infer<typeof templateDependencySchema>
export type TemplateProjectSettings = z.infer<typeof templateProjectSettingsSchema>
export type TemplateCustomFieldDefinition = z.infer<
  typeof templateCustomFieldDefinitionSchema
>
export type TemplateBudgetDefault = z.infer<typeof templateBudgetDefaultSchema>

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const templateParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  templateId: z.string().trim().min(1),
})

export const templateProjectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const createTemplateBodySchema = z.strictObject({
  key: templateKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  definition: templateDefinitionSchema,
  sourceProjectId: z.string().trim().min(1).nullable().optional(),
})

export const updateTemplateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    definition: templateDefinitionSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const saveAsTemplateBodySchema = z.strictObject({
  key: templateKeySchema,
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
})

const includeFlagsSchema = z.strictObject({
  includeWorkItems: z.boolean().optional(),
  includeDependencies: z.boolean().optional(),
  includeBudgets: z.boolean().optional(),
})

export const previewTemplateBodySchema = z.strictObject({
  startDate: z.number().int(),
  ...includeFlagsSchema.shape,
})

export const instantiateTemplateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(10).optional(),
  startDate: z.number().int(),
  idempotencyKey: z.string().trim().min(1).max(120).optional(),
  ...includeFlagsSchema.shape,
})

export const cloneProjectBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  key: z.string().trim().min(1).max(10).optional(),
  startDate: z.number().int().nullable().optional(),
})

export type CreateTemplateBody = z.infer<typeof createTemplateBodySchema>
export type UpdateTemplateBody = z.infer<typeof updateTemplateBodySchema>
export type SaveAsTemplateBody = z.infer<typeof saveAsTemplateBodySchema>
export type PreviewTemplateBody = z.infer<typeof previewTemplateBodySchema>
export type InstantiateTemplateBody = z.infer<
  typeof instantiateTemplateBodySchema
>
export type CloneProjectBody = z.infer<typeof cloneProjectBodySchema>
