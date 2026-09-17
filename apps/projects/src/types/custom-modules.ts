import { z } from 'zod'

const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
    'Use kebab-case, starting with a letter.'
  )

const nameSchema = z.string().trim().min(1).max(120)

export const createCustomModuleInputSchema = z.strictObject({
  scope: z.enum(['org', 'project']),
  projectId: z.string().trim().min(1).nullable().optional(),
  key: keySchema,
  singularName: nameSchema,
  pluralName: nameSchema,
  icon: z.string().trim().min(1).max(60).nullable().optional(),
  restrictedToRoleKeys: z
    .array(z.string().trim().min(1).max(120))
    .max(50)
    .optional(),
})

export const updateCustomModuleInputSchema = z
  .strictObject({
    singularName: nameSchema.optional(),
    pluralName: nameSchema.optional(),
    icon: z.string().trim().min(1).max(60).nullable().optional(),
    restrictedToRoleKeys: z
      .array(z.string().trim().min(1).max(120))
      .max(50)
      .nullable()
      .optional(),
  })
  .refine((input) => Object.keys(input).length > 0)

const fieldOptionSchema = z.strictObject({
  key: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(120),
})

export const createCustomModuleFieldInputSchema = z.strictObject({
  key: keySchema,
  label: nameSchema,
  fieldType: z.enum([
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
  ]),
  options: z.array(fieldOptionSchema).min(1).max(100).optional(),
  required: z.boolean().optional(),
  position: z.number().int().min(0).max(10000).optional(),
})

export const updateCustomModuleFieldInputSchema = z
  .strictObject({
    label: nameSchema.optional(),
    fieldType: z.string().trim().min(1).max(60).optional(),
    options: z.array(fieldOptionSchema).min(1).max(100).optional(),
    required: z.boolean().optional(),
    position: z.number().int().min(0).max(10000).optional(),
  })
  .refine((input) => Object.keys(input).length > 0)

export const createCustomModuleStatusInputSchema = z.strictObject({
  key: keySchema,
  label: nameSchema,
  category: z.enum(['open', 'in-progress', 'done']),
  position: z.number().int().min(0).max(10000).optional(),
  isDefault: z.boolean().optional(),
})

export const replaceCustomModuleStatusesInputSchema = z.strictObject({
  statuses: z
    .array(
      z.object({
        key: keySchema,
        label: nameSchema,
        category: z.enum(['open', 'in-progress', 'done']),
      })
    )
    .min(1)
    .max(50),
})

export const updateCustomModuleStatusInputSchema = z
  .strictObject({
    label: nameSchema.optional(),
    category: z.enum(['open', 'in-progress', 'done']).optional(),
    position: z.number().int().min(0).max(10000).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((input) => Object.keys(input).length > 0)

const recordFieldValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.string()),
  z.null(),
])

export const createCustomRecordInputSchema = z.strictObject({
  projectId: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(200),
  statusKey: z.string().trim().min(1).max(80).optional(),
  fields: z
    .array(
      z.strictObject({
        key: z.string().trim().min(1).max(120),
        value: recordFieldValueSchema,
      })
    )
    .max(200)
    .optional(),
})

export const updateCustomRecordInputSchema = z
  .strictObject({
    projectId: z.string().trim().min(1).nullable().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    statusKey: z.string().trim().min(1).max(80).optional(),
    fields: z
      .array(
        z.strictObject({
          key: z.string().trim().min(1).max(120),
          value: recordFieldValueSchema,
        })
      )
      .max(200)
      .optional(),
  })
  .refine((input) => Object.keys(input).length > 0)

export const createCustomModuleLinkInputSchema = z.strictObject({
  targetType: z.enum(['record', 'work-item', 'project', 'phase']),
  targetId: z.string().trim().min(1).max(120),
  relation: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
})

export const listCustomRecordsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  startingAfter: z.string().trim().min(1).optional(),
  endingBefore: z.string().trim().min(1).optional(),
  status: z.string().trim().min(1).max(80).optional(),
  projectId: z.string().trim().min(1).optional(),
  q: z.string().trim().max(200).optional(),
  fieldKey: z.string().trim().min(1).max(120).optional(),
  fieldValue: z.string().trim().max(200).optional(),
})

export const moduleReportQuerySchema = z.strictObject({
  from: z.coerce.number().int().min(0).optional(),
  to: z.coerce.number().int().min(0).optional(),
  fieldKey: z.string().trim().min(1).max(120).optional(),
  format: z.enum(['json', 'csv']).optional(),
})

export const createDashboardWidgetInputSchema = z.strictObject({
  kind: z.enum(['record-count', 'status-breakdown', 'recent-records']),
  moduleId: z.string().trim().min(1).max(120),
  userId: z.string().trim().min(1).max(120).nullable().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  position: z.number().int().min(0).max(10000).optional(),
})

export const updateDashboardWidgetInputSchema = z
  .strictObject({
    kind: z
      .enum(['record-count', 'status-breakdown', 'recent-records'])
      .optional(),
    userId: z.string().trim().min(1).max(120).nullable().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    position: z.number().int().min(0).max(10000).optional(),
  })
  .refine((input) => Object.keys(input).length > 0)

export type CreateCustomModuleBody = z.infer<
  typeof createCustomModuleInputSchema
>
export type UpdateCustomModuleBody = z.infer<
  typeof updateCustomModuleInputSchema
>
export type CreateCustomModuleFieldBody = z.infer<
  typeof createCustomModuleFieldInputSchema
>
export type CreateCustomRecordBody = z.infer<
  typeof createCustomRecordInputSchema
>
export type UpdateCustomRecordBody = z.infer<
  typeof updateCustomRecordInputSchema
>
export type CreateDashboardWidgetBody = z.infer<
  typeof createDashboardWidgetInputSchema
>

export type LayoutFieldControlKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multi-select'
  | 'boolean'

export type RecordFormField = {
  fieldKey: string
  label: string
  control: {
    kind: LayoutFieldControlKind
    options?: { value: string; label: string }[]
  }
}

export type ModuleBundle = {
  module: import('@876/projects/contracts').CustomModule
  fields: import('@876/projects/contracts').CustomModuleField[]
  statuses: import('@876/projects/contracts').CustomModuleStatus[]
  layout: import('@876/projects/contracts').Layout | null
  loadError: { code: string; message: string } | null
}
