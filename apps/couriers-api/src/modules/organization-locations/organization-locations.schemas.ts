import { z } from 'zod'

export const tenantIdParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})
export type TenantIdParams = z.infer<typeof tenantIdParamsSchema>

export const siteKindSchema = z.enum(['branch', 'warehouse'])

export const syncOrganizationLocationBodySchema = z.strictObject({
  kind: siteKindSchema,
  site_id: z.string().min(1),
})
export type SyncOrganizationLocationBody = z.infer<
  typeof syncOrganizationLocationBodySchema
>

export const organizationLocationReconciliationSchema = z
  .object({
    object: z.literal('organization_location_reconciliation'),
    tenant_id: z.string(),
    attempted: z.number().int().nonnegative(),
    succeeded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  })
  .meta({ id: 'OrganizationLocationReconciliation' })
export type OrganizationLocationReconciliation = z.infer<
  typeof organizationLocationReconciliationSchema
>
