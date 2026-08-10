import { z } from 'zod'

export const moduleKeySchema = z.enum([
  'general',
  'customers',
  'items',
  'packages',
  'pre_alerts',
  'warehouse',
  'manifests',
  'deliveries',
  'invoices',
  'payments',
  'portal',
])

export const organizationModuleSchema = z.object({
  object: z.literal('organization_module'),
  module: moduleKeySchema,
  label: z.string(),
  optional: z.boolean(),
  is_enabled: z.boolean(),
})

export const organizationModuleListSchema = z.object({
  object: z.literal('list'),
  data: z.array(organizationModuleSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})

export type ModuleKey = z.infer<typeof moduleKeySchema>
export type OrganizationModule = z.infer<typeof organizationModuleSchema>
export type OrganizationModuleList = z.infer<
  typeof organizationModuleListSchema
>

export const toggleModuleBodySchema = z.strictObject({
  is_enabled: z.boolean(),
})

export type ToggleModuleBody = z.input<typeof toggleModuleBodySchema>
