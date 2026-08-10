import { z } from 'zod'

import { packageStatusSchema } from '@/modules/packages'
import { tenantSchema } from '@/modules/tenants'

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

export const portalTenantResolveQuerySchema = z
  .strictObject({
    hostname: z.string().trim().min(1).max(253).optional(),
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/)
      .optional(),
  })
  .refine((query) => Boolean(query.hostname) !== Boolean(query.slug), {
    message: 'Provide exactly one of hostname or slug.',
  })

export const portalTenantSchema = tenantSchema

const portalAddressSchema = z.object({
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  region_code: z.string().nullable(),
  region_name: z.string().nullable(),
  country_code: z.string(),
  postal_code: z.string().nullable(),
})

export const portalShippingAddressSchema = z
  .object({
    object: z.literal('portal_shipping_address'),
    warehouse: z
      .object({
        id: z.string(),
        name: z.string(),
        address: portalAddressSchema,
      })
      .nullable(),
    mailbox: z.object({ id: z.string(), number: z.string() }).nullable(),
  })
  .meta({ id: 'PortalShippingAddress' })

export const portalEnrollmentBodySchema = z.strictObject({
  billing_customer_id: z.string().min(1),
})

export type PortalTenantParams = z.infer<typeof portalTenantParamsSchema>
export type PortalPackageParams = z.infer<typeof portalPackageParamsSchema>
export type PortalPackagesQuery = z.infer<typeof portalPackagesQuerySchema>
export type PortalTenantResolveQuery = z.infer<
  typeof portalTenantResolveQuerySchema
>
export type PortalTenant = z.infer<typeof portalTenantSchema>
export type PortalShippingAddress = z.infer<typeof portalShippingAddressSchema>
export type PortalEnrollmentBody = z.infer<typeof portalEnrollmentBodySchema>
