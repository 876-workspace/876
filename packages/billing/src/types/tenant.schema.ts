import { z } from 'zod'

import type { Tenant } from './tenant'

/**
 * The schema for a Billing workspace projection.
 *
 * Mirrors the Billing API's internal `tenantSchema`: the documented fields
 * are strict, and unknown server fields are ignored rather than rejected.
 */
export const TenantSchema = z.looseObject({
  id: z.string().min(1),
  organizationId: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'CLOSED']),
  defaultCurrency: z.string(),
  defaultLanguage: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Tenant>

/** The schema for a list of Billing workspace projections. */
export const TenantListSchema = z.array(TenantSchema) satisfies z.ZodType<
  Tenant[]
>
