import { z } from 'zod'

import { packageStatusSchema } from '@/modules/packages/packages.schemas'

export const portalTenantParamsSchema = z.strictObject({
  tenantId: z.string().min(1),
})

export const portalPackageParamsSchema = portalTenantParamsSchema.extend({
  id: z.string().min(1),
})

export const portalPackagesQuerySchema = z
  .strictObject({
    status: packageStatusSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    starting_after: z.string().min(1).optional(),
    ending_before: z.string().min(1).optional(),
  })
  .refine((query) => !(query.starting_after && query.ending_before), {
    message: 'Only one cursor may be provided.',
  })

export type PortalTenantParams = z.infer<typeof portalTenantParamsSchema>
export type PortalPackageParams = z.infer<typeof portalPackageParamsSchema>
export type PortalPackagesQuery = z.infer<typeof portalPackagesQuerySchema>
