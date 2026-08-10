import { z } from 'zod'

export const organizationLocationSiteKindSchema = z.enum([
  'branch',
  'warehouse',
])

export const syncOrganizationLocationBodySchema = z.strictObject({
  kind: organizationLocationSiteKindSchema,
  site_id: z.string().min(1),
})

export const organizationLocationReconciliationSchema = z.object({
  object: z.literal('organization_location_reconciliation'),
  tenant_id: z.string(),
  attempted: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
})

export type OrganizationLocationReconciliation = z.infer<
  typeof organizationLocationReconciliationSchema
>
export type SyncOrganizationLocationBody = z.input<
  typeof syncOrganizationLocationBodySchema
>
