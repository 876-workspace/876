import { z } from 'zod'

import type { BillingOrganization } from './organization'

/**
 * The schema for a Billing organization resource.
 */
export const BillingOrganizationSchema = z.strictObject({
  object: z.literal('billing_organization'),
  id: z.string().min(1),
  organizationId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  countryCode: z.string().length(2),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  defaultCurrency: z.string().length(3),
  defaultLanguage: z.string().min(2),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingOrganization>
