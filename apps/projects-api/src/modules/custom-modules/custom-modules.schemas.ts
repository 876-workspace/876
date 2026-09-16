import { z } from 'zod'

import { customFieldOptionSchema, customFieldTypeSchema } from '../work-structure/work-structure.schemas.js'

const kebabKeySchema = z.string().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)
const nonEmptyUpdate = (data: Record<string, unknown>) => Object.keys(data).length > 0

export const CUSTOM_MODULE_SCOPES = ['org', 'project'] as const
export const customModuleScopeSchema = z.enum(CUSTOM_MODULE_SCOPES)

export const CUSTOM_MODULE_STATUS_CATEGORIES = ['open', 'in-progress', 'done'] as const
export const customModuleStatusCategorySchema = z.enum(CUSTOM_MODULE_STATUS_CATEGORIES)

export const CUSTOM_MODULE_LINK_TARGETS = ['record', 'work-item', 'project', 'phase'] as const
export const customModuleLinkTargetSchema = z.enum(CUSTOM_MODULE_LINK_TARGETS)

export const DASHBOARD_WIDGET_KINDS = ['record-count', 'status-breakdown', 'recent-records'] as const
export const dashboardWidgetKindSchema = z.enum(DASHBOARD_WIDGET_KINDS)

export const CUSTOM_RECORD_TRIGGERS = [
  'custom-record.created',
  'custom-record.updated',
  'custom-record.status-changed',
] as const

export const organizationParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
})

export const moduleParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  moduleId: z.string().trim().min(1),
})

export const moduleKeyParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  moduleKey: kebabKeySchema,
})

export const fieldParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  moduleId: z.string().trim().min(1),
  fieldId: z.string().trim().min(1),
})

export const statusParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  moduleId: z.string().trim().min(1),
  statusId: z.string().trim().min(1),
})

export const recordParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  moduleId: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
})

export const linkParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  moduleId: z.string().trim().min(1),
  recordId: z.string().trim().min(1),
  linkId: z.string().trim().min(1),
})

export const widgetParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  widgetId: z.string().trim().min(1),
})

export const createModuleBodySchema = z
  .strictObject({
    scope: customModuleScopeSchema,
    projectId: z.string().trim().min(1).nullable().optional(),
    key: kebabKeySchema,
    singularName: z.string().trim().min(1).max(80),
    pluralName: z.string().trim().min(1).max(80),
    icon: z.string().trim().min(1).max(60).nullable().optional(),
    restrictedToRoleKeys: z.array(z.string().trim().min(1).max(80)).max(50).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'project' && !data.projectId) {
      ctx.addIssue({ code: 'custom', path: ['projectId'], message: 'Project-scoped modules require a projectId.' })
    }
    if (data.scope === 'org' && data.projectId) {
      ctx.addIssue({ code: 'custom', path: ['projectId'], message: 'Org-scoped modules must not carry a projectId.' })
    }
  })

export const updateModuleBodySchema = z
  .strictObject({
    key: kebabKeySchema.optional(),
    scope: customModuleScopeSchema.optional(),
    projectId: z.string().trim().min(1).nullable().optional(),
    singularName: z.string().trim().min(1).max(80).optional(),
    pluralName: z.string().trim().min(1).max(80).optional(),
    icon: z.string().trim().min(1).max(60).nullable().optional(),
    restrictedToRoleKeys: z.array(z.string().trim().min(1).max(80)).max(50).nullable().optional(),
  })
  .refine(nonEmptyUpdate, { message: 'At least one field must be provided for update' })

export const createModuleFieldBodySchema = z.strictObject({
  key: kebabKeySchema,
  label: z.string().trim().min(1).max(100),
  fieldType: customFieldTypeSchema,
  options: z.array(customFieldOptionSchema).optional(),
  required: z.boolean().optional(),
  position: z.number().int().optional(),
})

export const updateModuleFieldBodySchema = z
  .strictObject({
    label: z.string().trim().min(1).max(100).optional(),
    fieldType: customFieldTypeSchema.optional(),
    options: z.array(customFieldOptionSchema).optional(),
    required: z.boolean().optional(),
    position: z.number().int().optional(),
  })
  .refine(nonEmptyUpdate, { message: 'At least one field must be provided for update' })

export const createModuleStatusBodySchema = z.strictObject({
  key: kebabKeySchema,
  label: z.string().trim().min(1).max(100),
  category: customModuleStatusCategorySchema,
  position: z.number().int().optional(),
  isDefault: z.boolean().optional(),
})

export const updateModuleStatusBodySchema = z
  .strictObject({
    label: z.string().trim().min(1).max(100).optional(),
    category: customModuleStatusCategorySchema.optional(),
    position: z.number().int().optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(nonEmptyUpdate, { message: 'At least one field must be provided for update' })

export const reorderStatusesBodySchema = z.strictObject({
  orderedIds: z.array(z.string().trim().min(1)).min(1).max(100),
})

export const customRecordFieldInputSchema = z.strictObject({
  key: kebabKeySchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]),
})

export const createRecordBodySchema = z.strictObject({
  projectId: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(300),
  statusKey: z.string().trim().min(1).max(80).optional(),
  fields: z.array(customRecordFieldInputSchema).max(100).optional(),
  createdBy: z.string().trim().min(1).nullable().optional(),
})

export const updateRecordBodySchema = z
  .strictObject({
    projectId: z.string().trim().min(1).nullable().optional(),
    title: z.string().trim().min(1).max(300).optional(),
    statusKey: z.string().trim().min(1).max(80).optional(),
    fields: z.array(customRecordFieldInputSchema).max(100).optional(),
    updatedBy: z.string().trim().min(1).nullable().optional(),
  })
  .refine(nonEmptyUpdate, { message: 'At least one field must be provided for update' })

export const listRecordsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startingAfter: z.string().trim().min(1).optional(),
  endingBefore: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).optional(),
  projectId: z.string().trim().min(1).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  fieldKey: kebabKeySchema.optional(),
  fieldValue: z.string().trim().max(500).optional(),
})

export const createLinkBodySchema = z.strictObject({
  targetType: customModuleLinkTargetSchema,
  targetId: z.string().trim().min(1).max(120),
  relation: kebabKeySchema,
  createdBy: z.string().trim().min(1).nullable().optional(),
})

export const moduleReportQuerySchema = z.strictObject({
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
  fieldKey: kebabKeySchema.optional(),
  format: z.enum(['json', 'csv']).optional(),
})

export const createWidgetBodySchema = z.strictObject({
  kind: dashboardWidgetKindSchema,
  moduleId: z.string().trim().min(1),
  userId: z.string().trim().min(1).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().optional(),
})

export const updateWidgetBodySchema = z
  .strictObject({
    kind: dashboardWidgetKindSchema.optional(),
    userId: z.string().trim().min(1).nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    position: z.number().int().optional(),
  })
  .refine(nonEmptyUpdate, { message: 'At least one field must be provided for update' })

export const listWidgetsQuerySchema = z.strictObject({
  moduleId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
})

export type CreateModuleBody = z.infer<typeof createModuleBodySchema>
export type UpdateModuleBody = z.infer<typeof updateModuleBodySchema>
export type CreateModuleFieldBody = z.infer<typeof createModuleFieldBodySchema>
export type UpdateModuleFieldBody = z.infer<typeof updateModuleFieldBodySchema>
export type CreateModuleStatusBody = z.infer<typeof createModuleStatusBodySchema>
export type UpdateModuleStatusBody = z.infer<typeof updateModuleStatusBodySchema>
export type ReorderStatusesBody = z.infer<typeof reorderStatusesBodySchema>
export type CustomRecordFieldInput = z.infer<typeof customRecordFieldInputSchema>
export type CreateRecordBody = z.infer<typeof createRecordBodySchema>
export type UpdateRecordBody = z.infer<typeof updateRecordBodySchema>
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>
export type CreateLinkBody = z.infer<typeof createLinkBodySchema>
export type ModuleReportQuery = z.infer<typeof moduleReportQuerySchema>
export type CreateWidgetBody = z.infer<typeof createWidgetBodySchema>
export type UpdateWidgetBody = z.infer<typeof updateWidgetBodySchema>
export type ListWidgetsQuery = z.infer<typeof listWidgetsQuerySchema>
