import { z } from 'zod'

export const TenantCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,80}$/),
  // Inherited from the organization — the workspace never picks its own.
  defaultCurrency: z
    .string()
    .trim()
    .length(3)
    .transform((code) => code.toUpperCase())
    .default('JMD'),
})

export type TenantCreateParams = z.infer<typeof TenantCreateSchema>
export type TenantCreateInput = z.input<typeof TenantCreateSchema>

/** Billing workspace projected from the Billing data plane. */
export interface Tenant {
  id: string
  organizationId: string | null
  slug: string
  name: string
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
  countryCode: string
  defaultCurrency: string
  defaultLanguage: string
  provisioningVersion: number
  provisionedAt: number
  createdAt: number
  updatedAt: number
}

export interface TenantProvisioned {
  object: 'billing_tenant'
  id: string
  created: boolean
  provisioningVersion: number
}
