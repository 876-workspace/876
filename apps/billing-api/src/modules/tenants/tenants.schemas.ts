import { z } from 'zod'

export const tenantCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  // The workspace inherits the organization's single operating currency; it is
  // validated against the active currency catalog before the tenant is written.
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((code) => code.toUpperCase())
    .default('JMD'),
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

export const tenantLifecycleBodySchema = z.strictObject({
  organizationId: z.string().min(1).max(191),
  action: z.enum(['archive', 'restore']),
  deletedBy: z.string().min(1).max(191).nullable().optional(),
  reason: z.string().trim().max(500).nullable().optional(),
})

export const tenantLifecycleSchema = z.object({
  object: z.literal('billing_tenant_lifecycle'),
  organizationId: z.string(),
  action: z.enum(['archive', 'restore']),
  /** Null when the organization never had a Billing workspace. */
  tenantId: z.string().nullable(),
  status: z.string().nullable(),
  deletedAt: z.number().int().nullable(),
})

export type TenantCreateBody = z.infer<typeof tenantCreateBodySchema>
export type TenantLifecycleBody = z.infer<typeof tenantLifecycleBodySchema>
