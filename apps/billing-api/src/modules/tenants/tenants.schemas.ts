import { z } from 'zod'

export const tenantCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  defaultCurrency: z.literal('JMD').default('JMD'),
})

export const tenantProvisionedSchema = z.object({
  object: z.literal('billing_tenant'),
  id: z.string(),
  created: z.boolean(),
  provisioningVersion: z.number().int(),
})

export const integrationOrganizationParamsSchema = z.object({
  organizationId: z.string(),
})

export const integrationOrganizationSchema = z.object({
  object: z.literal('billing_organization'),
  id: z.string(),
  organizationId: z.string().nullable(),
  slug: z.string(),
  name: z.string(),
  countryCode: z.string(),
  status: z.string(),
  defaultCurrency: z.string(),
  defaultLanguage: z.string(),
  provisioningVersion: z.number().int(),
  provisionedAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export type TenantCreateBody = z.infer<typeof tenantCreateBodySchema>
