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
export const moduleStateSchema = z
  .object({
    object: z.literal('organization_module'),
    module: moduleKeySchema,
    label: z.string(),
    optional: z.boolean(),
    is_enabled: z.boolean(),
  })
  .meta({ id: 'OrganizationModule' })
export const tenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export const moduleParamsSchema = tenantParamsSchema.extend({
  module: moduleKeySchema,
})
export const toggleBodySchema = z.strictObject({ is_enabled: z.boolean() })
export type TenantParams = z.infer<typeof tenantParamsSchema>
export type ModuleParams = z.infer<typeof moduleParamsSchema>
export type ToggleBody = z.infer<typeof toggleBodySchema>
